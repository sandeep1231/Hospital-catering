import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export default function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const header = (req.headers['authorization'] || '').toString();
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    (req as any).user = { id: payload.id, role: payload.role, name: payload.name, hospitalId: payload.hospitalId };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
