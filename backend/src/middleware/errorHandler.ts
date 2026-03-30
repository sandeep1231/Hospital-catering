import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.entries(err.errors).map(([field, e]) => ({
      field,
      message: (e as any).message,
    }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.kind}: ${err.value}` });
  }

  // Body-parser payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large' });
  }

  // JSON parse error
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON' });
  }

  console.error('Unhandled error:', err);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    message: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
  });
}
