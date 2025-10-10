import Patient from '../models/patient';
import MenuItem from '../models/menuItem';
import User from '../models/user';
import bcrypt from 'bcrypt';

export async function seedDemo() {
  const count = await Patient.countDocuments();
  if (count > 0) return;

  await User.create({ name: 'Admin', email: 'admin@example.com', passwordHash: await bcrypt.hash('password', 10), role: 'admin' });

  const p1 = await Patient.create({ name: 'John Doe', dob: new Date(1980,1,3), phone: '555-1234', inDate: new Date(), inTime: '09:30', roomType: 'Ward', bed: '12', diet: 'Low salt', status: 'in_patient', transactionType: 'insurance', age: 45, sex: 'male', totalBill: 1200, dailyBill: 200, recurringDetails: { freq: 'weekly' }, feedback: '' });
  const p2 = await Patient.create({ name: 'Jane Smith', dob: new Date(1992,6,11), phone: '555-5678', inDate: new Date(), inTime: '11:00', roomType: 'ICU', bed: '7', diet: 'High protein', status: 'in_patient', transactionType: 'card', age: 33, sex: 'female', totalBill: 3000, dailyBill: 500, recurringDetails: { freq: 'daily' }, feedback: '' });

  await MenuItem.create({ name: 'Oatmeal', description: 'Warm oatmeal', dietTags: ['low-fat'], calories: 150 });
  await MenuItem.create({ name: 'Grilled Chicken', description: 'Grilled breast', dietTags: ['high-protein'], calories: 300 });

  console.log('Seeded demo data');
}
