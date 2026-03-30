import Vendor from '../models/vendor';
import { tenantManager } from './tenantDb';

/**
 * One-time index fixes/migrations.
 * - Drops a legacy sparse index on patients { hospitalId: 1, code: 1 } if it exists
 *   so our new partial index can be created without conflict.
 * Iterates all vendor tenant DBs since patients now live per-vendor.
 */
export async function fixIndexes() {
  try {
    const vendors = await Vendor.find({}).lean();
    for (const vendor of vendors) {
      try {
        const conn = tenantManager.getConnection(String(vendor._id));
        const patientColl = conn.collection('patients');

        const idx = await patientColl.indexExists('hospitalId_1_code_1');
        if (idx) {
          await patientColl.dropIndex('hospitalId_1_code_1');
          console.log(`Dropped legacy index hospitalId_1_code_1 for vendor ${vendor._id}`);
        }
      } catch (e) {
        console.warn(`fixIndexes error for vendor ${vendor._id}:`, e);
      }
    }
  } catch (e) {
    console.warn('fixIndexes encountered an error:', e);
  }
}
