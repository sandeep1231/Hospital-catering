import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'missing user' });
    const userRole = (user as any).role;
    // super-admin has access to everything
    if (userRole === 'super-admin') return next();
    if (!roles.includes(userRole)) return res.status(403).json({ message: 'forbidden' });
    next();
  };
}

export function requireSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'missing user' });
    if (user.role !== 'super-admin') return res.status(403).json({ message: 'super-admin access required' });
    next();
  };
}

export function requireWriteAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'missing user' });
    if (user.readOnly) return res.status(403).json({ message: 'Read-only access – hospital assignment has been revoked' });
    next();
  };
}
