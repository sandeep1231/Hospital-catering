import { z } from 'zod';

export const createPatientSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  dob: z.string().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
  inDate: z.string().max(30).optional(),
  inTime: z.string().max(10).optional(),
  roomType: z.string().trim().max(100).optional(),
  bed: z.string().trim().max(100).optional(),
  roomNo: z.string().trim().max(100).optional(),
  diet: z.string().trim().max(200).optional(),
  status: z.enum(['in_patient', 'discharged', 'outpatient']).optional(),
  transactionType: z.string().trim().max(50).optional(),
  age: z.number().int().min(0).max(150).optional(),
  sex: z.string().trim().max(20).optional(),
  feedback: z.string().trim().max(5000).optional(),
  allergies: z.array(z.string().trim().max(200)).max(50).optional(),
  notes: z.string().trim().max(5000).optional(),
  code: z.string().trim().max(100).optional(),
  dietNote: z.string().trim().max(2000).optional(),
  dischargeDate: z.string().max(30).optional(),
  dischargeTime: z.string().max(10).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const patientFeedbackSchema = z.object({
  feedback: z.string().trim().max(5000).optional(),
  dietNote: z.string().trim().max(2000).optional(),
});
