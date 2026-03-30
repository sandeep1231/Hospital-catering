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
  const vendorId = (req as any).user?.vendorId;
  if (!vendorId) {
    return res.status(403).json({ message: 'No vendor context. Super-admin cannot access tenant-scoped endpoints directly.' });
  }

  const conn = tenantManager.getConnection(String(vendorId));
  req.tenantModels = getTenantModels(conn);
  next();
}
