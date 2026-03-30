import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  description: z.string().trim().max(2000).optional(),
  dietTags: z.array(z.string().trim().max(100)).max(20).optional(),
  calories: z.number().min(0).max(10000).optional(),
  allergens: z.array(z.string().trim().max(100)).max(20).optional(),
  price: z.number().min(0).max(100000).optional().default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();
