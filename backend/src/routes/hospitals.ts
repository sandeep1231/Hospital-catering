import { Router, Request, Response } from 'express';
import Hospital from '../models/hospital';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

// Public: list hospitals for login/register selection
router.get('/', async (req: Request, res: Response) => {
  // Optional search query; anchor to start to help index usage and escape regex specials
  const raw = (req.query.q as string || '').trim();
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cond: any = raw
    ? { name: { $regex: `^${escaped}`, $options: 'i' } }
    : {};

  // Only return minimal fields, sort by name (can use index), and cap result size
  const hospitals = await Hospital.find(cond)
    .select('name address')
    .sort({ name: 1 })
    .limit(50)
    .lean();

  // Cache for 5 minutes; data changes rarely and this endpoint is public
  res.set('Cache-Control', 'public, max-age=300');
  res.json(hospitals);
});

// Admin: create hospital
router.post(
  '/',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { name, address } = req.body || {};
    if (!name) return res.status(400).json({ message: 'name is required' });
    const existing = await Hospital.findOne({ name });
    if (existing) return res.status(400).json({ message: 'hospital exists' });
    const h = await Hospital.create({ name, address });
    res.status(201).json(h);
  }
);

// Admin: update hospital
router.put(
  '/:id',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const { name, address } = req.body || {};
    const updated = await Hospital.findByIdAndUpdate(
      req.params.id,
      { name, address },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'not found' });
    res.json(updated);
  }
);

// Admin: delete hospital
router.delete(
  '/:id',
  auth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    await Hospital.findByIdAndDelete(req.params.id);
    res.status(204).send();
  }
);

export default router;
