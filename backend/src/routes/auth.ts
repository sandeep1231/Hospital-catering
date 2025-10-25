import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import Hospital from '../models/hospital';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, hospitalId, role } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'missing fields' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'email exists' });
  const hash = await bcrypt.hash(password, 10);
  let hospId = hospitalId;
  if (!hospId) {
    const def = await Hospital.findOne();
    hospId = def?._id as any;
  } else {
    const exists = await Hospital.findById(hospitalId);
    if (!exists) return res.status(400).json({ message: 'invalid hospital' });
  }
  // role from body is ignored unless it is one of allowed (admin, diet-supervisor, dietician). Default dietician.
  const allowed = ['admin','diet-supervisor','dietician'];
  const roleToSet = allowed.includes(role) ? role : 'dietician';
  const u = new User({ name, email, passwordHash: hash, hospitalId: hospId, role: roleToSet as any });
  await u.save();
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role, hospitalId: u.hospitalId });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password, hospitalId } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.status(401).json({ message: 'invalid' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ message: 'invalid' });
  let hid = u.hospitalId;
  if (hospitalId) {
    if (hid && String(hid) !== String(hospitalId)) return res.status(403).json({ message: 'wrong hospital' });
    const exists = await Hospital.findById(hospitalId);
    if (!exists) return res.status(400).json({ message: 'invalid hospital' });
    hid = hospitalId;
  }
  // backfill hospitalId for legacy users without hospital assigned
  if (!hid) {
    const def = await Hospital.findOne();
    if (def) hid = def._id as any;
    if (!def) {
      const created = await Hospital.create({ name: 'General Hospital', address: '123 Main St' });
      hid = created._id as any;
    }
    if (!u.hospitalId) { u.hospitalId = hid as any; await u.save(); }
  }
  const token = jwt.sign({ id: u._id, role: u.role, name: u.name, hospitalId: hid }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
  res.json({ token });
});

export default router;
