import { Router, Request, Response } from 'express';
import MenuItem from '../models/menuItem';
import auth from '../middleware/auth';
import { requireWriteAccess } from '../middleware/roles';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const items = await MenuItem.find({ ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }).limit(200);
  res.json(items);
});

router.post('/', auth, requireWriteAccess(), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const m = new MenuItem({ ...req.body, hospitalId: hid, vendorId: vid });
  await m.save();
  res.status(201).json(m);
});

router.put('/:id', auth, requireWriteAccess(), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const updated = await MenuItem.findOneAndUpdate({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: 'not found' });
  res.json(updated);
});

router.delete('/:id', auth, requireWriteAccess(), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  await MenuItem.findOneAndDelete({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) });
  res.status(204).send();
});

export default router;
