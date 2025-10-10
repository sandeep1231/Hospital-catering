import { Router, Request, Response } from 'express';
import Order from '../models/order';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import AuditLog from '../models/auditLog';

const router = Router();

// helper to write audit
async function writeAudit(entity: string, entityId: any, action: string, user: any, details?: any) {
  try { await AuditLog.create({ entity, entityId, action, userId: user?.id || user?._id || null, details }); } catch (e) { console.error('audit error', e); }
}

// list orders for a date
router.get('/', auth, async (req: Request, res: Response) => {
  const date = req.query.date ? new Date(String(req.query.date)) : new Date();
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const orders = await Order.find({ date: dateOnly }).limit(500).populate('items.menuItemId').populate('items.patientId');
  res.json(orders);
});

// create manual order (dietician or admin)
router.post('/', auth, requireRole('dietician','admin'), async (req: Request, res: Response) => {
  const { date, items, notes } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'items required' });
  const d = date ? new Date(date) : new Date();
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // allow mealSlot to be passed from client (optional)
  const normalizedItems = items.map((it: any) => ({ patientId: it.patientId, menuItemId: it.menuItemId, quantity: it.quantity || 1, notes: it.notes, mealSlot: it.mealSlot }));
  const order = await Order.create({ date: dateOnly, items: normalizedItems, notes, kitchenStatus: 'pending', deliveryStatus: 'pending' });
  await writeAudit('Order', order._id, 'create', (req as any).user, { manual: true });
  const populated = await Order.findById(order._id).populate('items.menuItemId').populate('items.patientId');
  res.status(201).json(populated);
});

// kitchen users update kitchen status
router.put('/:id/kitchen-status', auth, requireRole('kitchen', 'vendor', 'admin'), async (req: Request, res: Response) => {
  const { kitchenStatus } = req.body;
  const updated = await Order.findByIdAndUpdate(req.params.id, { kitchenStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit('Order', updated._id, 'kitchenStatus:'+kitchenStatus, (req as any).user, { kitchenStatus });
  res.json(updated);
});

// delivery users update delivery status
router.put('/:id/deliver', auth, requireRole('delivery', 'admin'), async (req: Request, res: Response) => {
  const { deliveryStatus } = req.body;
  const updated = await Order.findByIdAndUpdate(req.params.id, { deliveryStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit('Order', updated._id, 'deliveryStatus:'+deliveryStatus, (req as any).user, { deliveryStatus });
  res.json(updated);
});

// admin override endpoint
router.put('/:id/status', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const { kitchenStatus, deliveryStatus } = req.body;
  const updated = await Order.findByIdAndUpdate(req.params.id, { kitchenStatus, deliveryStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit('Order', updated._id, 'adminStatusUpdate', (req as any).user, { kitchenStatus, deliveryStatus });
  res.json(updated);
});

// bulk deliver (admin only)
router.post('/bulk-deliver', auth, requireRole('admin'), async (req: Request, res: Response) => {
  const ids: string[] = req.body.ids || [];
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'ids required' });
  const result = await Order.updateMany({ _id: { $in: ids } }, { deliveryStatus: 'delivered' });
  try {
    for (const id of ids) await writeAudit('Order', id, 'deliveryStatus:delivered', (req as any).user, { bulk: true });
  } catch (e) { console.error('audit error', e); }
  res.json({ modifiedCount: result.matchedCount });
});

export default router;
