import User from '../models/user';
import bcrypt from 'bcryptjs';

export async function seedDemo() {
  // Bootstrap: ensure super-admin account exists (everything else is created via UI)
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
}
