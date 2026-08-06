import { z } from 'zod';

export const createEventTypeSchema = z.object({
  title: z
    .string({
      message: 'title is required and must be a string',
    })
    .min(5, { message: 'Title must be at least 5 characters' })
    .max(80, { message: 'Title cannot exceed 80 characters' })
    .trim(),
});
