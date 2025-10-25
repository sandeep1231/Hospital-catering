import Patient from '../models/patient';
import User from '../models/user';
import Hospital from '../models/hospital';
import bcrypt from 'bcryptjs';

export async function seedDemo() {
  // ensure default hospital exists
  let hosp = await Hospital.findOne();
  if (!hosp) hosp = await Hospital.create({ name: 'General Hospital', address: '123 Main St' });

  const userCount = await User.countDocuments({ hospitalId: hosp._id });
  if (userCount === 0) {
    await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: await bcrypt.hash('password', 10), role: 'admin', hospitalId: hosp._id });
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
