import { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'missing user' });
    const userRole = (user as any).role;
    if (!roles.includes(userRole)) return res.status(403).json({ message: 'forbidden' });
    next();
  };
}
