import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Vendor from '../models/vendor';
import { tenantManager } from '../utils/tenantDb';
import { getTenantModels } from '../utils/tenantModels';
import { istStartOfDayUTCForDate } from '../utils/time';

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || '';
  if (!MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(MONGODB_URI, { dbName: 'dietflow_shared' });
  tenantManager.init(MONGODB_URI);

  const vendors = await Vendor.find({}).lean();
  let totalCreated = 0;

  for (const vendor of vendors) {
    const conn = tenantManager.getConnection(String(vendor._id));
    const { Patient, PatientMovement } = getTenantModels(conn);

    const patients = await Patient.find({}).lean();
    let created = 0;
    for (const p of patients) {
      const exists = await PatientMovement.findOne({ patientId: p._id }).lean();
      if (exists) continue;
      const start = istStartOfDayUTCForDate(p.inDate ? new Date(p.inDate) : new Date());
      await PatientMovement.create({
        patientId: p._id,
        hospitalId: (p as any).hospitalId || null,
        roomType: (p as any).roomType || null,
        roomNo: (p as any).roomNo || null,
        bed: (p as any).bed || null,
        start,
        end: (p as any).status === 'discharged' ? (p as any).dischargeDate || null : null
      });
      created++;
    }
    console.log(`Vendor ${vendor._id}: created ${created} movement records.`);
    totalCreated += created;
  }

  console.log(`Backfill complete. Total created: ${totalCreated} movement records.`);
  await tenantManager.closeAll();
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
