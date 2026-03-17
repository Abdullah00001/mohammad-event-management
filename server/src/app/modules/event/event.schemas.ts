import { z } from 'zod';

export const EventCreateSchema = z.object({
  eventName: z.string(),
  description: z.string().min(1, { message: 'description is required' }),
  startDate: z.coerce.date({ error: 'startDate must be a valid date' }),
  startTime: z.string(),
  maxParticipantsCount: z.int(),
  lat: z.float64(),
  long: z.float64(),
  activityTypes: z.array(z.string()),
});

export type TEventCreatePayload = z.infer<typeof EventCreateSchema>;
