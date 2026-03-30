import { Request, Response, NextFunction } from 'express';
import { tenantManager } from '../utils/tenantDb';
import { getTenantModels } from '../utils/tenantModels';

/**
 * Middleware that resolves the vendor's tenant database connection
 * and attaches tenant-scoped Mongoose models to `req.tenantModels`.
 *
 * Must be mounted AFTER auth middleware (needs req.user.vendorId).
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  // Super-admins operate at platform level — let them through without tenant context
  if (user?.role === 'super-admin') return next();

  const vendorId = user?.vendorId;
  if (!vendorId) {
    return res.status(403).json({ message: 'No vendor context.' });
  }

  const conn = tenantManager.getConnection(String(vendorId));
  req.tenantModels = getTenantModels(conn);
  next();
}
