import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole, requireWriteAccess } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { createDietTypeSchema, updateDietTypeSchema } from '../schemas/dietType.schemas';
import { TenantModels } from '../utils/tenantModels';

const router = Router();
function tm(req: Request): TenantModels { return req.tenantModels!; }

// list diet types (public to logged in users)
router.get('/', auth, async (req: Request, res: Response) => {
  const { DietType } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const list = await DietType.find({ ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }).sort({ name: 1 });
  const userRole = (req as any).user?.role;
  if (userRole === 'admin') return res.json(list);
  res.json(list.filter(d => d.active).map(d => ({ _id: d._id, name: d.name })));
});

// admin CRUD
router.post('/', auth, requireRole('admin'), requireWriteAccess(), validate({ body: createDietTypeSchema }), async (req: Request, res: Response) => {
  const { name, defaultPrice, active } = req.body;
  try {
    const { DietType } = tm(req);
    const hid = (req as any).user?.hospitalId;
    const vid = (req as any).user?.vendorId;
    const d = await DietType.create({ name, defaultPrice, active, hospitalId: hid, vendorId: vid });
    res.status(201).json(d);
  } catch (e) { console.error(e); res.status(500).json({ message: 'failed' }); }
});

router.put('/:id', auth, requireRole('admin'), requireWriteAccess(), validate({ body: updateDietTypeSchema }), async (req: Request, res: Response) => {
  try {
    const { DietType } = tm(req);
    const hid = (req as any).user?.hospitalId;
    const vid = (req as any).user?.vendorId;
    const body: any = {};
    if (req.body.name !== undefined) body.name = req.body.name;
    if (req.body.defaultPrice !== undefined) body.defaultPrice = req.body.defaultPrice;
    if (req.body.active !== undefined) body.active = req.body.active;
    const updated = await DietType.findOneAndUpdate({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }, body, { new: true });
    if (!updated) return res.status(404).json({ message: 'not found' });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ message: 'failed' }); }
});

router.delete('/:id', auth, requireRole('admin'), requireWriteAccess(), async (req: Request, res: Response) => {
  try { const { DietType } = tm(req); const hid = (req as any).user?.hospitalId; const vid = (req as any).user?.vendorId; const ok = await DietType.findOneAndDelete({ _id: req.params.id, ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }); if (!ok) return res.status(404).json({ message: 'not found' }); res.json({}); } catch (e) { console.error(e); res.status(500).json({ message: 'failed' }); }
});

export default router;
