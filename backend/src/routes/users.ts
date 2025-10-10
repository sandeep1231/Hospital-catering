import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/user';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

// List users (admin only)
router.get('/', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  const cond: any = q ? { $or: [ { name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } } ] } : {};
  const users = await User.find(cond).select({ passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  res.json(users);
});

// Create user (admin can set role)
router.post('/', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'missing fields' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'email exists' });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ name, email, passwordHash: hash, role: role || 'user' });
  await u.save();
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

// Update role or name (admin)
router.put('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const { name, role, password } = req.body;
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'not found' });
  if (name) u.name = name;
  if (role) u.role = role;
  if (password) u.passwordHash = await bcrypt.hash(password, 10);
  await u.save();
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

// Delete user (admin)
router.delete('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;
