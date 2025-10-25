import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import DietType from '../models/dietType';

const router = Router();

// list diet types (public to logged in users)
router.get('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const list = await DietType.find({ ...(hid ? { hospitalId: hid } : {}) }).sort({ name: 1 });
  const userRole = (req as any).user?.role;
  if (userRole === 'admin') return res.json(list);
  res.json(list.filter(d => d.active).map(d => ({ _id: d._id, name: d.name })));
});

// admin CRUD
router.post('/', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const { name, defaultPrice, active } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name required' });
  try {
    const hid = (req as any).user?.hospitalId;
    const d = await DietType.create({ name: String(name), defaultPrice: Number(defaultPrice || 0), active: active !== false, hospitalId: hid });
    res.status(201).json(d);
  } catch (e) { console.error(e); res.status(500).json({ message: 'failed' }); }
});

router.put('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const hid = (req as any).user?.hospitalId;
    const body: any = {};
    if (req.body.name !== undefined) body.name = String(req.body.name || '');
    if (req.body.defaultPrice !== undefined) body.defaultPrice = Number(req.body.defaultPrice || 0);
    if (req.body.active !== undefined) body.active = !!req.body.active;
    const updated = await DietType.findOneAndUpdate({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) }, body, { new: true });
    if (!updated) return res.status(404).json({ message: 'not found' });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ message: 'failed' }); }
});

router.delete('/:id', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try { const hid = (req as any).user?.hospitalId; const ok = await DietType.findOneAndDelete({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) }); if (!ok) return res.status(404).json({ message: 'not found' }); res.json({}); } catch (e) { console.error(e); res.status(500).json({ message: 'failed' }); }
});

export default router;
