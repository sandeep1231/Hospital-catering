import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import User from '../models/user';
import { TenantModels } from '../utils/tenantModels';

const router = Router();
function tm(req: Request): TenantModels { return req.tenantModels!; }

// List audit logs (admin only) with pagination and optional filters
router.get('/', auth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { AuditLog } = tm(req);
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '25'), 10) || 25));

    const cond: any = {};
    const entity = (req.query.entity as string || '').trim();
    if (entity) cond.entity = entity;
    const action = (req.query.action as string || '').trim();
    if (action) cond.action = { $regex: action, $options: 'i' };
    const userId = (req.query.userId as string || '').trim();
    if (userId) cond.userId = userId;

    const total = await AuditLog.countDocuments(cond);
    const items = await AuditLog.find(cond)
      .sort({ timestamp: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Manual join for userId from shared User collection (cross-DB)
    const userIds = [...new Set(items.map((i: any) => i.userId).filter(Boolean).map(String))];
    const users = userIds.length > 0
      ? await User.find({ _id: { $in: userIds } }).select('name email').lean()
      : [];
    const userMap = new Map(users.map((u: any) => [String(u._id), { _id: u._id, name: u.name, email: u.email }]));
    const enriched = items.map((i: any) => ({ ...i, userId: userMap.get(String(i.userId)) || i.userId }));

    res.json({ items: enriched, total, page, pageSize });
  } catch (e) {
    console.error('audit log list error', e);
    res.status(500).json({ message: 'failed to load audit logs' });
  }
});

// Get distinct entity values for filter dropdown
router.get('/entities', auth, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const { AuditLog } = tm(_req);
    const entities = await AuditLog.distinct('entity');
    res.json(entities.filter(Boolean).sort());
  } catch (e) {
    res.json([]);
  }
});

export default router;
