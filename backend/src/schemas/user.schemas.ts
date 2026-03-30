import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().toLowerCase().email('Invalid email format').max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  role: z.enum(['admin', 'diet-supervisor', 'dietician']).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.enum(['admin', 'diet-supervisor', 'dietician']).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200).optional(),
});
