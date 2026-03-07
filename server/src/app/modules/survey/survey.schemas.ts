import { z } from 'zod';

export const profileTraitsSchema = z.object({
  energyScore: z.number().int().min(0).max(10),
  curiosityScore: z.number().int().min(0).max(10),
  rhythmScore: z.number().int().min(0).max(10),
});

export type TProfileTraitsInput = z.infer<typeof profileTraitsSchema>;
