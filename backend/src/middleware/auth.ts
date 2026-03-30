import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    let token = (req.headers['authorization'] || '').toString().replace('Bearer ', '').trim();
    if (!token) {
      const q = (req.query as any).auth;
      if (q && typeof q === 'string') token = q;
    }
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload: any = jwt.verify(token, secret);
    (req as any).user = { id: payload.id, role: payload.role, name: payload.name, hospitalId: payload.hospitalId, vendorId: payload.vendorId, readOnly: !!payload.readOnly };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
