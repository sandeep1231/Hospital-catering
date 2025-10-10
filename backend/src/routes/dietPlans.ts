import { Router, Request, Response } from 'express';
import DietPlan from '../models/dietPlan';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import Order from '../models/order';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  const plans = await DietPlan.find().limit(100);
  res.json(plans);
});

router.post('/', auth, requireRole('dietician', 'admin'), async (req: Request, res: Response) => {
  const p = new DietPlan(req.body);
  await p.save();

  let createdOrder = null;
  try {
    // If a patient is selected, create an order for the plan's start date (immediate order)
    if (p.patientId && p.startDate) {
      const d = new Date(p.startDate);
      const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const firstMeals = Array.isArray((p as any).days) && (p as any).days.length > 0 ? (p as any).days[0].meals || [] : [];
      const items: any[] = [];
      for (const meal of firstMeals) {
        const list = Array.isArray(meal.items) ? meal.items : [];
        for (const itm of list) {
          const id = typeof itm === 'string' ? itm : itm?.id;
          const notes = typeof itm === 'string' ? undefined : itm?.notes;
          if (!id) continue;
          items.push({ patientId: p.patientId, menuItemId: id, quantity: 1, mealSlot: meal.slot, notes });
        }
      }
      if (items.length > 0) {
        createdOrder = await Order.create({ date: dateOnly, items, sourcePlanId: p._id, notes: 'Created from diet plan' });
      }
    }
  } catch (e) { console.error('Failed to create order from diet plan', e); }

  res.status(201).json({ plan: p, createdOrder });
});

export default router;
