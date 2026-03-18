import { z } from 'zod';

export const EventStatusSchema = z.enum([
  'UPCOMING',
  'ONGOING',
  'COMPLETED',
  'DELETED',
]);

export const EventRoleSchema = z.enum(['HOST', 'TRAVELER']);

export const EventCreateSchema = z.object({
  eventName: z
    .string({ error: 'eventName is required' })
    .min(3, { message: 'eventName must be at least 3 characters' })
    .max(100, { message: 'eventName must not exceed 100 characters' })
    .trim(),

  description: z
    .string({ error: 'description is required' })
    .min(10, { message: 'description must be at least 10 characters' })
    .max(1000, { message: 'description must not exceed 1000 characters' })
    .trim(),

  startDate: z.coerce
    .date({ error: 'startDate must be a valid ISO date' })
    .refine((date) => date >= new Date(), {
      message: 'startDate must be in the future',
    }),

  // HH:mm format — stored as string in Prisma
  startTime: z
    .string({ error: 'startTime is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
      message: 'startTime must be in HH:mm 24-hour format (e.g. 14:30)',
    }),

  maxParticipantsCount: z
    .number({ error: 'maxParticipantsCount must be a number' })
    .int({ message: 'maxParticipantsCount must be an integer' })
    .min(2, { message: 'maxParticipantsCount must be at least 2' })
    .max(500, { message: 'maxParticipantsCount must not exceed 500' })
    .default(10),

  lat: z
    .number({ error: 'lat must be a number' })
    .min(-90, { message: 'lat must be between -90 and 90' })
    .max(90, { message: 'lat must be between -90 and 90' }),

  long: z
    .number({ error: 'long must be a number' })
    .min(-180, { message: 'long must be between -180 and 180' })
    .max(180, { message: 'long must be between -180 and 180' }),

  eventTypeId: z.uuid({ message: 'eventTypeId must be a valid UUID' }),
});

export type TEventCreatePayload = z.infer<typeof EventCreateSchema>;

export const EventUpdateSchema = EventCreateSchema.partial().extend({
  eventStatus: EventStatusSchema.optional(),
});

export type TEventUpdatePayload = z.infer<typeof EventUpdateSchema>;
