import { z } from 'zod';

export const notificationQuerySchema = z.object({
  // Pagination
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'Page must be at least 1'))
    .default(1),

  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1))
    .default(10),
});

export type TNotificationQueryParams = z.infer<typeof notificationQuerySchema>;
