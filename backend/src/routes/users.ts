import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

// List users (admin only)
router.get('/', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const q = (req.query.q as string || '').trim();
  const cond: any = { ...(hid ? { hospitalId: hid } : {}) };
  if (q) cond.$or = [ { name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } } ];
  const users = await User.find(cond).select({ passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  res.json(users);
});

// Create user (admin can set role)
router.post('/', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'missing fields' });
  const allowed = ['admin','diet-supervisor','dietician'];
  const roleToSet = allowed.includes(role) ? role : 'dietician';
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'email exists' });
  const hash = await bcrypt.hash(password, 10);
  const u = new User({ name, email, passwordHash: hash, role: roleToSet, hospitalId: hid });
  await u.save();
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role, hospitalId: u.hospitalId });
});

// Update role or name (admin)
router.put('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const { name, role, password } = req.body;
  const u = await User.findOne({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
  if (!u) return res.status(404).json({ message: 'not found' });
  if (name) u.name = name;
  if (role) {
    const allowed = ['admin','diet-supervisor','dietician'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'invalid role' });
    u.role = role as any;
  }
  if (password) u.passwordHash = await bcrypt.hash(password, 10);
  await u.save();
  res.json({ id: u._id, name: u.name, email: u.email, role: u.role, hospitalId: u.hospitalId });
});

// Delete user (admin)
router.delete('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  await User.findOneAndDelete({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
  res.json({ ok: true });
});

export default router;
