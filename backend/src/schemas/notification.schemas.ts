import { z } from 'zod';

export const markReadSchema = z.object({
  ids: z.array(z.string().max(100)).min(1, 'ids required').max(200, 'Maximum 200 items per request'),
});
