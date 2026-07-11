import { z } from 'zod';

export const getConversationQuerySchema = z
  .object({
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1, 'Page must be at least 1'))
      .default(1),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().min(1).max(50))
      .default(10),
  })
  .strict();

export type TGetConversationQuery = z.infer<typeof getConversationQuerySchema>;

