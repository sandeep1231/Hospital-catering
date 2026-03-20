import { Router, Request, Response } from 'express';
import auth from '../middleware/auth';
import Notification from '../models/notification';

const router = Router();

// GET / — list recent notifications for the user's hospital (last 50)
router.get('/', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  if (!hid) return res.status(400).json({ message: 'Missing hospitalId' });
  const notifications = await Notification.find({ hospitalId: hid })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const userId = (req as any).user?.id;
  // Attach a `read` flag for the current user
  const result = notifications.map((n: any) => ({
    ...n,
    read: Array.isArray(n.readBy) && n.readBy.some((r: any) => String(r) === String(userId)),
  }));
  res.json(result);
});

// GET /unread-count — count of unread notifications for current user
router.get('/unread-count', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const userId = (req as any).user?.id;
  if (!hid) return res.status(400).json({ message: 'Missing hospitalId' });
  const count = await Notification.countDocuments({
    hospitalId: hid,
    readBy: { $ne: userId },
  });
  res.json({ count });
});

// POST /mark-read — mark specific notifications as read
router.post('/mark-read', auth, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids array required' });
  }
  await Notification.updateMany(
    { _id: { $in: ids } },
    { $addToSet: { readBy: userId } }
  );
  res.json({ success: true });
});

// POST /mark-all-read — mark all notifications as read for current user
router.post('/mark-all-read', auth, async (req: Request, res: Response) => {
  const hid = (req as any).user?.hospitalId;
  const userId = (req as any).user?.id;
  await Notification.updateMany(
    { hospitalId: hid, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
  res.json({ success: true });
});

export default router;
