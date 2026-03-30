import { z } from 'zod';

export const createDietTypeSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  defaultPrice: z.number().min(0).max(100000).optional().default(0),
  active: z.boolean().optional().default(true),
});

export const updateDietTypeSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  defaultPrice: z.number().min(0).max(100000).optional(),
  active: z.boolean().optional(),
});
