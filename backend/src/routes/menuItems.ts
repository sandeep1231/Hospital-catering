import { Router, Request, Response } from 'express';
import MenuItem from '../models/menuItem';
import auth from '../middleware/auth';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const items = await MenuItem.find(hid ? { hospitalId: hid } : {}).limit(200);
  res.json(items);
});

router.post('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const m = new MenuItem({ ...req.body, hospitalId: hid });
  await m.save();
  res.status(201).json(m);
});

router.put('/:id', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const updated = await MenuItem.findOneAndUpdate({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) }, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'not found' });
  res.json(updated);
});

router.delete('/:id', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  await MenuItem.findOneAndDelete({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}) });
  res.status(204).send();
});

export default router;
