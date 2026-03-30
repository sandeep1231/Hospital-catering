import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole, requireWriteAccess } from '../middleware/roles';
import { istStartOfDayUTCForDate } from '../utils/time';
import { validate } from '../middleware/validate';
import { createDietPlanSchema } from '../schemas/dietPlan.schemas';
import { TenantModels } from '../utils/tenantModels';

const router = Router();
function tm(req: Request): TenantModels { return req.tenantModels!; }

router.get('/', auth, async (req: Request, res: Response) => {
  const { DietPlan } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const plans = await DietPlan.find({ ...(hid ? { hospitalId: hid } : {}), ...(vid ? { vendorId: vid } : {}) }).limit(100);
  res.json(plans);
});

router.post('/', auth, requireRole('dietician', 'admin'), requireWriteAccess(), validate({ body: createDietPlanSchema }), async (req: Request, res: Response) => {
  const { DietPlan, Order, MenuItem } = tm(req);
  const hid = (req as any).user?.hospitalId;
  const vid = (req as any).user?.vendorId;
  const { name, patientId, startDate, endDate, recurrence, days, notes } = req.body;
  const p = new DietPlan({ name, patientId, startDate, endDate, recurrence, days, notes, hospitalId: hid, vendorId: vid });
  await p.save();

  let createdOrder = null;
  try {
    // If a patient is selected, create an order for the plan's start date (immediate order)
    if (p.patientId && p.startDate) {
  const d = new Date(p.startDate);
  const dateOnly = istStartOfDayUTCForDate(d);
      const firstMeals = Array.isArray((p as any).days) && (p as any).days.length > 0 ? (p as any).days[0].meals || [] : [];
      const items: any[] = [];
      for (const meal of firstMeals) {
        const list = Array.isArray(meal.items) ? meal.items : [];
        for (const itm of list) {
          const id = typeof itm === 'string' ? itm : itm?.id;
          const notes = typeof itm === 'string' ? undefined : itm?.notes;
          if (!id) continue;
          const menu = await MenuItem.findById(id).lean();
          items.push({ patientId: p.patientId, menuItemId: id, quantity: 1, mealSlot: meal.slot, notes, unitPrice: (menu?.price as number) || 0 });
        }
      }
      if (items.length > 0) {
        createdOrder = await Order.create({ date: dateOnly, items, sourcePlanId: p._id, notes: 'Created from diet plan', hospitalId: hid, vendorId: vid });
      }
    }
  } catch (e) { console.error('Failed to create order from diet plan', e); }

  res.status(201).json({ plan: p, createdOrder });
});

export default router;
