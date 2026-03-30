import { z } from 'zod';

export const createHospitalSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(200),
  address: z.string().trim().max(500).optional(),
});

export const updateHospitalSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  address: z.string().trim().max(500).optional(),
});
