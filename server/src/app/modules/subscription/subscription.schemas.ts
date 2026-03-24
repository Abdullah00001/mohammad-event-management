import { z } from 'zod';

const UUIDSchema = z.uuid();

export const PlanSchema = z.object({
  title: z.string().min(1, { error: 'Title must not be empty' }).max(100, {
    error: 'Title must be at most 100 characters',
  }),

  price: z
    .number('Price must be a valid number')
    .nonnegative('Price must be 0 or greater'),

  duration: z
    .number({
      error: 'Duration must be a valid number',
    })
    .int({ error: 'Duration must be a whole number' })
    .positive({ error: 'Duration must be greater than 0' }),

  features: z
    .array(UUIDSchema, {
      error: 'Features must be an array of UUIDs',
    })
    .min(1, { error: 'At least one feature is required' }),
});

export type TPlan = z.infer<typeof PlanSchema>;
