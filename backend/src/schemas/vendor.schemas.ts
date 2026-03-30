import { z } from 'zod';

export const vendorRegisterSchema = z.object({
  vendorName: z.string().trim().min(2, 'Vendor name must be at least 2 characters').max(200),
  contactEmail: z.string().trim().toLowerCase().email('Invalid email format').max(200),
  contactPhone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  adminName: z.string().trim().min(1, 'Admin name is required').max(200),
  adminEmail: z.string().trim().toLowerCase().email('Invalid admin email format').max(200),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

export const vendorStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended'], {
    error: 'Status must be one of: pending, approved, rejected, suspended',
  }),
});

export const vendorUpdateSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  contactEmail: z.string().trim().toLowerCase().email().max(200).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
});
