import Agenda from 'agenda';
import DietPlan from '../models/dietPlan';
import Order from '../models/order';
import Patient from '../models/patient';
import MenuItem from '../models/menuItem';

export default function setupAgenda(mongoConnString: string) {
  const agenda = new Agenda({ db: { address: mongoConnString, collection: 'agendaJobs' } });

  agenda.define('generate-todays-orders', async (job: any) => {
    const today = new Date();
    const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // find active plans and expand
    const plans = await DietPlan.find({ startDate: { $lte: dateOnly }, $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dateOnly } }] });

    for (const plan of plans) {
      // simple handling: if recurrence none and startDate != today skip
      if ((plan as any).recurrence === 'none') {
        const s = new Date((plan as any).startDate);
        const same = s.getFullYear() === dateOnly.getFullYear() && s.getMonth() === dateOnly.getMonth() && s.getDate() === dateOnly.getDate();
        if (!same) continue;
      }

      // check if order already generated for this plan and date
      const exists = await Order.findOne({ sourcePlanId: (plan as any)._id, date: dateOnly, hospitalId: (plan as any).hospitalId });
      if (exists) continue;

      // pick dayIndex
      let dayIndex = (dateOnly.getDay() + 6) % 7; // convert Sunday(0) to 6, Monday=0
      let day = ((plan as any).days as any[]).find((d: any) => d.dayIndex === dayIndex) || (plan as any).days[0];
      if (!day) continue;

      const items: any[] = [];
      for (const meal of day.meals) {
        for (const item of meal.items) {
          const id = typeof item === 'string' ? item : item?.id;
          const notes = typeof item === 'string' ? undefined : item?.notes;
          if (!id) continue;
          const menu = await MenuItem.findById(id).exec();
          if (menu) items.push({ patientId: (plan as any).patientId, menuItemId: menu._id, quantity: 1, mealSlot: meal.slot, notes, unitPrice: (menu.price as number) || 0 });
        }
      }

      if (items.length === 0) continue;

      await Order.create({ date: dateOnly, items, sourcePlanId: (plan as any)._id, notes: 'Generated from diet plan', hospitalId: (plan as any).hospitalId });
    }
  });

  (async function() { await agenda.start(); await agenda.every('0 5 * * *', 'generate-todays-orders'); })();
  return agenda;
}
