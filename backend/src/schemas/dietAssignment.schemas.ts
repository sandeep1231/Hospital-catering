import { z } from 'zod';

export const createDietAssignmentSchema = z.object({
  patientId: z.string().min(1, 'patientId is required').max(100),
  date: z.string().min(1, 'date is required').max(30),
  fromTime: z.string().max(10).optional(),
  toTime: z.string().max(10).optional(),
  diet: z.string().min(1, 'diet is required').max(200),
  note: z.string().trim().max(5000).optional(),
  price: z.number().min(0).max(100000).optional(),
});

export const updateDietAssignmentSchema = z.object({
  date: z.string().max(30).optional(),
  fromTime: z.string().max(10).optional(),
  toTime: z.string().max(10).optional(),
  diet: z.string().trim().min(1).max(200).optional(),
  note: z.string().trim().max(5000).optional(),
  price: z.number().min(0).max(100000).optional(),
  status: z.enum(['pending', 'delivered', 'cancelled']).optional(),
});

export const bulkDeliverSchema = z.object({
  ids: z.array(z.string().max(100)).min(1, 'ids required').max(100, 'Maximum 100 items per request'),
});

export const bulkCreateSchema = z.object({
  patientId: z.string().min(1).max(100),
  startDate: z.string().min(1).max(30),
  days: z.number().int().min(1).max(365).optional(),
  untilDischarge: z.boolean().optional(),
  diet: z.string().min(1).max(200),
  note: z.string().trim().max(5000).optional(),
  overwriteExisting: z.boolean().optional(),
});

export const changeDietSchema = z.object({
  patientId: z.string().min(1).max(100),
  startDate: z.string().min(1).max(30),
  endDate: z.string().max(30).optional(),
  untilDischarge: z.boolean().optional(),
  diet: z.string().min(1).max(200),
  note: z.string().trim().max(5000).optional(),
});
