import { z } from 'zod';

export const vendorHospitalRequestSchema = z.object({
  hospitalId: z.string().min(1, 'hospitalId is required').max(100),
});
