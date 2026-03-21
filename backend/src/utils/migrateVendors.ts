/**
 * One-time migration script: Creates Vendor + VendorHospital records for existing data.
 *
 * Usage: npx ts-node src/utils/migrateVendors.ts
 *
 * What it does:
 * 1. Groups existing non-super-admin users by hospitalId
 * 2. For each hospital: creates a Vendor (status: approved), a VendorHospital (approved), and sets vendorId on users
 * 3. Preserves all existing data relationships — no data is deleted
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/user';
import Hospital from '../models/hospital';
import Vendor from '../models/vendor';
import VendorHospital from '../models/vendorHospital';

async function migrate() {
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Find all non-super-admin users without a vendorId
  const usersWithoutVendor = await User.find({
    role: { $ne: 'super-admin' },
    $or: [{ vendorId: { $exists: false } }, { vendorId: null }]
  }).lean();

  if (usersWithoutVendor.length === 0) {
    console.log('No users need migration — all already have vendorId');
    await mongoose.disconnect();
    return;
  }

  // Group by hospitalId
  const hospitalGroups: { [key: string]: any[] } = {};
  for (const u of usersWithoutVendor) {
    const hid = String(u.hospitalId || 'no-hospital');
    if (!hospitalGroups[hid]) hospitalGroups[hid] = [];
    hospitalGroups[hid].push(u);
  }

  console.log(`Found ${usersWithoutVendor.length} users across ${Object.keys(hospitalGroups).length} hospitals to migrate`);

  for (const [hospitalIdStr, users] of Object.entries(hospitalGroups)) {
    let hospitalName = 'Unknown Hospital';
    if (hospitalIdStr !== 'no-hospital') {
      const hosp = await Hospital.findById(hospitalIdStr);
      if (hosp) hospitalName = hosp.name;
    }

    const vendorName = `${hospitalName} Vendor`;

    // Check if a vendor with this name already exists
    let vendor = await Vendor.findOne({ name: vendorName });
    if (!vendor) {
      vendor = await Vendor.create({
        name: vendorName,
        contactEmail: `vendor-${hospitalIdStr}@dietflow.in`,
        status: 'approved'
      });
      console.log(`  Created vendor: "${vendorName}"`);
    }

    // Create VendorHospital assignment if needed
    if (hospitalIdStr !== 'no-hospital') {
      const existing = await VendorHospital.findOne({ vendorId: vendor._id, hospitalId: hospitalIdStr });
      if (!existing) {
        await VendorHospital.create({
          vendorId: vendor._id,
          hospitalId: hospitalIdStr,
          status: 'approved',
          approvedAt: new Date()
        });
        console.log(`  Linked vendor to hospital: ${hospitalName}`);
      }
    }

    // Update all users in this group
    const userIds = users.map(u => u._id);
    await User.updateMany({ _id: { $in: userIds } }, { $set: { vendorId: vendor._id } });
    console.log(`  Updated ${userIds.length} users with vendorId`);
  }

  console.log('Migration complete!');
  await mongoose.disconnect();
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
