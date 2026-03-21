import Patient from '../models/patient';
import User from '../models/user';
import Hospital from '../models/hospital';
import Vendor from '../models/vendor';
import VendorHospital from '../models/vendorHospital';
import bcrypt from 'bcryptjs';

export async function seedDemo() {
  // ensure default hospital exists
  let hosp = await Hospital.findOne();
  if (!hosp) hosp = await Hospital.create({ name: 'General Hospital', address: '123 Main St' });

  // ensure super-admin exists
  const superAdmin = await User.findOne({ role: 'super-admin' });
  if (!superAdmin) {
    await User.create({
      name: 'Super Admin',
      email: 'superadmin@dietflow.in',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'super-admin'
    });
    console.log('Seeded super-admin user (superadmin@dietflow.in / admin123)');
  }

  // ensure default vendor exists and is linked to existing admin users
  let defaultVendor = await Vendor.findOne();
  if (!defaultVendor) {
    defaultVendor = await Vendor.create({
      name: 'Default Vendor',
      contactEmail: 'vendor@dietflow.in',
      status: 'approved'
    });
    console.log('Seeded default vendor');

    // Create vendor-hospital assignment
    const existingAssignment = await VendorHospital.findOne({ vendorId: defaultVendor._id, hospitalId: hosp._id });
    if (!existingAssignment) {
      await VendorHospital.create({
        vendorId: defaultVendor._id,
        hospitalId: hosp._id,
        status: 'approved',
        approvedAt: new Date()
      });
      console.log('Linked default vendor to default hospital');
    }

    // Backfill vendorId for existing non-super-admin users
    await User.updateMany(
      { role: { $ne: 'super-admin' }, vendorId: { $exists: false } },
      { $set: { vendorId: defaultVendor._id } }
    );
    await User.updateMany(
      { role: { $ne: 'super-admin' }, vendorId: null },
      { $set: { vendorId: defaultVendor._id } }
    );
    console.log('Backfilled vendorId for existing users');
  }

  const userCount = await User.countDocuments({ hospitalId: hosp._id, role: { $ne: 'super-admin' } });
  if (userCount === 0) {
    await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: await bcrypt.hash('password', 10), role: 'admin', hospitalId: hosp._id, vendorId: defaultVendor._id });
  }

  // seed default diet types if missing (always ensure present)
  try {
    const DietType = require('../models/dietType').default;
    const existing = await DietType.countDocuments({ hospitalId: hosp._id });
    if (existing === 0) {
      await DietType.create({ name: 'Normal Diet', defaultPrice: 130, hospitalId: hosp._id });
      await DietType.create({ name: 'Liquid Diet', defaultPrice: 80, hospitalId: hosp._id });
      await DietType.create({ name: 'Protein Diet', defaultPrice: 150, hospitalId: hosp._id });
      await DietType.create({ name: 'Other', defaultPrice: 0, hospitalId: hosp._id });
      console.log('Seeded diet types');
    }
  } catch (e) { console.error('diet type seed error', e); }

  // seed demo patients only if none exist for default hospital
  const count = await Patient.countDocuments({ hospitalId: hosp._id });
  if (count === 0) {
    await Patient.create({ name: 'John Doe', dob: new Date(1980,1,3), phone: '555-1234', inDate: new Date(), inTime: '09:30', roomType: 'Ward', bed: '12', diet: 'Normal Diet', status: 'in_patient', transactionType: 'insurance', age: 45, sex: 'male', hospitalId: hosp._id });
    await Patient.create({ name: 'Jane Smith', dob: new Date(1992,6,11), phone: '555-5678', inDate: new Date(), inTime: '11:00', roomType: 'ICU', bed: '7', diet: 'Protein Diet', status: 'in_patient', transactionType: 'card', age: 33, sex: 'female', hospitalId: hosp._id });
    console.log('Seeded demo data with default hospital (patients)');
  }
}
