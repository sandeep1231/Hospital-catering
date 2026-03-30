import { z } from 'zod';

const mealItemSchema = z.union([
  z.string().max(100),
  z.object({
    id: z.string().max(100),
    notes: z.string().trim().max(2000).optional(),
  }),
]);

const mealSchema = z.object({
  slot: z.string().trim().max(50),
  items: z.array(mealItemSchema).max(100),
});

const daySchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  meals: z.array(mealSchema).max(20),
});

export const createDietPlanSchema = z.object({
  name: z.string().trim().max(200).optional(),
  patientId: z.string().max(100).optional(),
  startDate: z.string().min(1, 'startDate is required').max(30),
  endDate: z.string().max(30).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  days: z.array(daySchema).max(31),
  notes: z.string().trim().max(5000).optional(),
});
