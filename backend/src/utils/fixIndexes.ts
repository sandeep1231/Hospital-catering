import mongoose from 'mongoose';

/**
 * One-time index fixes/migrations.
 * - Drops a legacy sparse index on patients { hospitalId: 1, code: 1 } if it exists
 *   so our new partial index can be created without conflict.
 */
export async function fixIndexes() {
  try {
    const conn = mongoose.connection;
    const patientColl = conn.collection('patients');

    const idx = await patientColl.indexExists('hospitalId_1_code_1');
    if (idx) {
      try {
        await patientColl.dropIndex('hospitalId_1_code_1');
        console.log('Dropped legacy index hospitalId_1_code_1');
      } catch (e) {
        console.warn('Failed to drop legacy patient index hospitalId_1_code_1:', e);
      }
    }
  } catch (e) {
    console.warn('fixIndexes encountered an error:', e);
  }
}
