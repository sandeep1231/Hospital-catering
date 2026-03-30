import { z } from 'zod';

export const preLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format').max(200),
  password: z.string().min(1, 'Password is required').max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format').max(200),
  password: z.string().min(1, 'Password is required').max(200),
  hospitalId: z.string().max(100).optional(),
});
