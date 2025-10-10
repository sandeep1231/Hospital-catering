import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) return res.status(400).json({ message: 'missing fields' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ message: 'email exists' });
  const hash = await bcrypt.hash(password, 10);
  // Always use default role on public registration
  const u = new User({ name, email, passwordHash: hash });
  await u.save();
  res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const u = await User.findOne({ email });
  if (!u) return res.status(401).json({ message: 'invalid' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ message: 'invalid' });
  const token = jwt.sign({ id: u._id, role: u.role, name: u.name }, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' });
  res.json({ token });
});

export default router;
