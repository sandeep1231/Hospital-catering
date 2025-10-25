import { Router, Request, Response } from 'express';
import Hospital from '../models/hospital';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';

const router = Router();

// Public: list hospitals for login/register selection
router.get('/', async (req: Request, res: Response) => {
  const q = (req.query.q as string || '').trim();
  const cond: any = q ? { name: { $regex: q, $options: 'i' } } : {};
  const hospitals = await Hospital.find(cond).sort({ name: 1 }).lean();
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
