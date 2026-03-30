import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole, requireWriteAccess } from '../middleware/roles';
import { istStartOfDayUTCFromYMD, istStartOfDayUTCForDate } from '../utils/time';
import { validate } from '../middleware/validate';
import { createOrderSchema, kitchenStatusSchema, deliveryStatusSchema, adminStatusSchema, bulkDeliverOrderSchema } from '../schemas/order.schemas';
import { TenantModels } from '../utils/tenantModels';

const router = Router();
function tm(req: Request): TenantModels { return req.tenantModels!; }

// helper to write audit
async function writeAudit(req: Request, entity: string, entityId: any, action: string, user: any, details?: any) {
  try { const { AuditLog } = tm(req); await AuditLog.create({ entity, entityId, action, userId: user?.id || user?._id || null, hospitalId: user?.hospitalId || null, vendorId: user?.vendorId || null, details }); } catch (e) { console.error('audit error', e); }
}

// list orders for a date
router.get('/', auth, async (req: Request, res: Response) => {
  const { Order } = tm(req);
  const user = (req as any).user;
  const dateStr = req.query.date ? String(req.query.date) : undefined;
  const dateOnly = dateStr ? istStartOfDayUTCFromYMD(dateStr) : istStartOfDayUTCForDate(new Date());
  const cond: any = { date: dateOnly };
  if (user?.hospitalId) cond.hospitalId = user.hospitalId;
  if (user?.vendorId) cond.vendorId = user.vendorId;
  const orders = await Order.find(cond).limit(500).populate('items.menuItemId').populate('items.patientId');
  res.json(orders);
});

// create manual order (dietician or admin)
router.post('/', auth, requireRole('dietician','admin'), requireWriteAccess(), validate({ body: createOrderSchema }), async (req: Request, res: Response) => {
  const { Order, MenuItem } = tm(req);
  const user = (req as any).user;
  const { date, items, notes } = req.body;
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
  const order = await Order.create({ date: dateOnly, items: normalizedItems, notes, kitchenStatus: 'pending', deliveryStatus: 'pending', hospitalId: user?.hospitalId, vendorId: user?.vendorId });
  await writeAudit(req, 'Order', order._id, 'create', user, { manual: true });
  const populated = await Order.findById(order._id).populate('items.menuItemId').populate('items.patientId');
  res.status(201).json(populated);
});

// kitchen users update kitchen status
router.put('/:id/kitchen-status', auth, requireRole('kitchen', 'vendor', 'admin'), requireWriteAccess(), validate({ body: kitchenStatusSchema }), async (req: Request, res: Response) => {
  const { Order } = tm(req);
  const user = (req as any).user;
  const { kitchenStatus } = req.body;
  const updated = await Order.findOneAndUpdate({ _id: req.params.id, ...(user?.hospitalId ? { hospitalId: user.hospitalId } : {}), ...(user?.vendorId ? { vendorId: user.vendorId } : {}) }, { kitchenStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit(req, 'Order', updated._id, 'kitchenStatus:'+kitchenStatus, user, { kitchenStatus });
  res.json(updated);
});

// delivery users update delivery status
router.put('/:id/deliver', auth, requireRole('delivery', 'admin'), requireWriteAccess(), validate({ body: deliveryStatusSchema }), async (req: Request, res: Response) => {
  const { Order } = tm(req);
  const user = (req as any).user;
  const { deliveryStatus } = req.body;
  const updated = await Order.findOneAndUpdate({ _id: req.params.id, ...(user?.hospitalId ? { hospitalId: user.hospitalId } : {}), ...(user?.vendorId ? { vendorId: user.vendorId } : {}) }, { deliveryStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit(req, 'Order', updated._id, 'deliveryStatus:'+deliveryStatus, user, { deliveryStatus });
  res.json(updated);
});

// admin override endpoint
router.put('/:id/status', auth, requireRole('admin'), requireWriteAccess(), validate({ body: adminStatusSchema }), async (req: Request, res: Response) => {
  const { Order } = tm(req);
  const user = (req as any).user;
  const { kitchenStatus, deliveryStatus } = req.body;
  const updated = await Order.findOneAndUpdate({ _id: req.params.id, ...(user?.hospitalId ? { hospitalId: user.hospitalId } : {}), ...(user?.vendorId ? { vendorId: user.vendorId } : {}) }, { kitchenStatus, deliveryStatus }, { new: true }).populate('items.menuItemId').populate('items.patientId');
  if (!updated) return res.status(404).json({ message: 'not found' });
  await writeAudit(req, 'Order', updated._id, 'adminStatusUpdate', user, { kitchenStatus, deliveryStatus });
  res.json(updated);
});

// bulk deliver (admin only)
router.post('/bulk-deliver', auth, requireRole('admin'), requireWriteAccess(), validate({ body: bulkDeliverOrderSchema }), async (req: Request, res: Response) => {
  const { Order } = tm(req);
  const user = (req as any).user;
  const ids: string[] = req.body.ids;
  const cond: any = { _id: { $in: ids } };
  if (user?.hospitalId) cond.hospitalId = user.hospitalId;
  const result = await Order.updateMany(cond, { deliveryStatus: 'delivered' });
  try {
    for (const id of ids) await writeAudit(req, 'Order', id, 'deliveryStatus:delivered', user, { bulk: true });
  } catch (e) { console.error('audit error', e); }
  res.json({ modifiedCount: result.matchedCount });
});

export default router;
