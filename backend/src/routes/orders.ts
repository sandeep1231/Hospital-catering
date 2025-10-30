import { Router, Request, Response } from 'express';
import Order from '../models/order';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import AuditLog from '../models/auditLog';
import { istStartOfDayUTCFromYMD, istStartOfDayUTCForDate } from '../utils/time';
import MenuItem from '../models/menuItem';

const router = Router();

// helper to write audit
async function writeAudit(entity: string, entityId: any, action: string, user: any, details?: any) {
  try { await AuditLog.create({ entity, entityId, action, userId: user?.id || user?._id || null, details }); } catch (e) { console.error('audit error', e); }
}

// list orders for a date
router.get('/', auth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const dateStr = req.query.date ? String(req.query.date) : undefined;
  const dateOnly = dateStr ? istStartOfDayUTCFromYMD(dateStr) : istStartOfDayUTCForDate(new Date());
  const cond: any = { date: dateOnly };
  if (user?.hospitalId) cond.hospitalId = user.hospitalId;
  const orders = await Order.find(cond).limit(500).populate('items.menuItemId').populate('items.patientId');
  res.json(orders);
});

// create manual order (dietician or admin)
router.post('/', auth, requireRole('dietician','admin'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { date, items, notes } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'items required' });
  const dateOnly = date ? istStartOfDayUTCFromYMD(String(date)) : istStartOfDayUTCForDate(new Date());
  // allow mealSlot to be passed from client (optional) and compute unitPrice
  const normalizedItems = await Promise.all(items.map(async (it: any) => {
    const menu = await MenuItem.findById(it.menuItemId).lean();
    return {
      patientId: it.patientId,
      menuItemId: it.menuItemId,
      quantity: it.quantity || 1,
      notes: it.notes,
      mealSlot: it.mealSlot,
      unitPrice: (menu?.price as number) || 0
    };
  }));
  const order = await Order.create({ date: dateOnly, items: normalizedItems, notes, kitchenStatus: 'pending', deliveryStatus: 'pending', hospitalId: user?.hospitalId });
  await writeAudit('Order', order._id, 'create', user, { manual: true });
  const populated = await Order.findById(order._id).populate('items.menuItemId').populate('items.patientId');
  res.status(201).json(populated);
});

// kitchen users update kitchen status
router.put('/:id/kitchen-status', auth, requireRole('kitchen', 'vendor', 'admin'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { kitchenStatus } = req.body;
  const updated = await Order.findOneAndUpdate({ _id: req.params.id, ...(user?.hospitalId ? { hospitalId: user.hospitalId } : {}) }, { kitchenStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit('Order', updated._id, 'kitchenStatus:'+kitchenStatus, user, { kitchenStatus });
  res.json(updated);
});

// delivery users update delivery status
router.put('/:id/deliver', auth, requireRole('delivery', 'admin'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { deliveryStatus } = req.body;
  const updated = await Order.findOneAndUpdate({ _id: req.params.id, ...(user?.hospitalId ? { hospitalId: user.hospitalId } : {}) }, { deliveryStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit('Order', updated._id, 'deliveryStatus:'+deliveryStatus, user, { deliveryStatus });
  res.json(updated);
});

// admin override endpoint
router.put('/:id/status', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const { kitchenStatus, deliveryStatus } = req.body;
  const updated = await Order.findOneAndUpdate({ _id: req.params.id, ...(user?.hospitalId ? { hospitalId: user.hospitalId } : {}) }, { kitchenStatus, deliveryStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit('Order', updated._id, 'adminStatusUpdate', user, { kitchenStatus, deliveryStatus });
  res.json(updated);
});

// bulk deliver (admin only)
router.post('/bulk-deliver', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const user = (req as any).user;
  const ids: string[] = req.body.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids required' });
  const cond: any = { _id: { $in: ids } };
  if (user?.hospitalId) cond.hospitalId = user.hospitalId;
  const result = await Order.updateMany(cond, { deliveryStatus: 'delivered' });
  try {
    for (const id of ids) await writeAudit('Order', id, 'deliveryStatus:delivered', user, { bulk: true });
  } catch (e) { console.error('audit error', e); }
  res.json({ modifiedCount: result.matchedCount });
});

export default router;
