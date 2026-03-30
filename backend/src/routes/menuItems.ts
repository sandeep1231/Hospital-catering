import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireWriteAccess } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createMenuItemSchema, updateMenuItemSchema } from '../schemas/menuItem.schemas';
import { TenantModels } from '../utils/tenantModels';

const router = Router();
function tm(req: Request): TenantModels { return req.tenantModels!; }

router.get('/', auth, async (req: Request, res: Response) => {
  const { MenuItem } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const items = await MenuItem.find({ ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }).limit(200);
  res.json(items);
});

router.post('/', auth, requireWriteAccess(), validate({ body: createMenuItemSchema }), async (req: Request, res: Response) => {
  const { MenuItem } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const { name, description, dietTags, calories, allergens, price } = req.body;
  const m = new MenuItem({ name, description, dietTags, calories, allergens, price, hospitalId: hid, vendorId: vid });
  await m.save();
  res.status(201).json(m);
});

router.put('/:id', auth, requireWriteAccess(), validate({ body: updateMenuItemSchema }), async (req: Request, res: Response) => {
  const { MenuItem } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const { name, description, dietTags, calories, allergens, price } = req.body;
  const fields: any = {};
  if (name !== undefined) fields.name = name;
  if (description !== undefined) fields.description = description;
  if (dietTags !== undefined) fields.dietTags = dietTags;
  if (calories !== undefined) fields.calories = calories;
  if (allergens !== undefined) fields.allergens = allergens;
  if (price !== undefined) fields.price = price;
  const updated = await MenuItem.findOneAndUpdate({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }, { $set: fields }, { new: true });
  if (!updated) return res.status(404).json({ message: 'not found' });
  res.json(updated);
});

router.delete('/:id', auth, requireWriteAccess(), async (req: Request, res: Response) => {
  const { MenuItem } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  await MenuItem.findOneAndDelete({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) });
  res.status(204).send();
});

export default router;
