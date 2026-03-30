import { z } from 'zod';

const orderItemSchema = z.object({
  patientId: z.string().min(1).max(100),
  menuItemId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(1000).optional().default(1),
  notes: z.string().trim().max(2000).optional(),
  mealSlot: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']).optional(),
});

export const createOrderSchema = z.object({
  date: z.string().max(30).optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required').max(200),
  notes: z.string().trim().max(5000).optional(),
});

export const kitchenStatusSchema = z.object({
  kitchenStatus: z.enum(['pending', 'preparing', 'ready', 'cancelled'], {
    error: 'kitchenStatus must be one of: pending, preparing, ready, cancelled',
  }),
});

export const deliveryStatusSchema = z.object({
  deliveryStatus: z.enum(['pending', 'assigned', 'in_transit', 'delivered'], {
    error: 'deliveryStatus must be one of: pending, assigned, in_transit, delivered',
  }),
});

export const adminStatusSchema = z.object({
  kitchenStatus: z.enum(['pending', 'preparing', 'ready', 'cancelled']).optional(),
  deliveryStatus: z.enum(['pending', 'assigned', 'in_transit', 'delivered']).optional(),
});

export const bulkDeliverOrderSchema = z.object({
  ids: z.array(z.string().max(100)).min(1, 'ids required').max(100, 'Maximum 100 items per request'),
});
