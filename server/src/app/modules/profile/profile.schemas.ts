import { Gender } from '@prisma/client';
import { z } from 'zod';

export const profileSetupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z
    .number()
    .int('Age must be an integer')
    .min(0, 'Age must be a positive number'),
  gender: z.enum(Gender),
  location: z.string().min(1, 'Location is required'),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  age: z.number().int().min(0).optional(),
  gender: z.enum(Gender).optional(),
  location: z.string().min(1).optional(),
  bio: z.string().min(1).optional(),
});

export type TProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
