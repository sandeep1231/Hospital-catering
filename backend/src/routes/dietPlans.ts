import { Router, Request, Response } from 'express';
import DietPlan from '../models/dietPlan';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import Order from '../models/order';
import MenuItem from '../models/menuItem';
import { istStartOfDayUTCForDate } from '../utils/time';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const plans = await DietPlan.find(hid ? { hospitalId: hid } : {}).limit(100);
  res.json(plans);
});

router.post('/', auth, requireRole('dietician', 'admin'), async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const p = new DietPlan({ ...req.body, hospitalId: hid });
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
        createdOrder = await Order.create({ date: dateOnly, items, sourcePlanId: p._id, notes: 'Created from diet plan', hospitalId: hid });
      }
    }
  } catch (e) { console.error('Failed to create order from diet plan', e); }

  res.status(201).json({ plan: p, createdOrder });
});

export default router;
