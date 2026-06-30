import { isoUtcRegex } from '@/const';
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

  description: z.string({ error: 'description is required' }).trim(),

  startDate: z.coerce
    .date({ error: 'startDate must be a valid ISO date' })
    .refine((date) => date >= new Date(), {
      message: 'startDate must be in the future',
    }),

  endDate: z.coerce
    .date({ error: 'endDate must be a valid ISO date' })
    .refine((date) => date >= new Date(), {
      message: 'endDate must be in the future',
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

  lng: z
    .number({ error: 'lng must be a number' })
    .min(-180, { message: 'lng must be between -180 and 180' })
    .max(180, { message: 'lng must be between -180 and 180' }),

  eventTypeId: z.uuid({ message: 'eventTypeId must be a valid UUID' }),
  isPrivate: z.boolean().default(false),
});

export type TEventCreatePayload = z.infer<typeof EventCreateSchema>;

export const EventUpdateSchema = EventCreateSchema.partial().extend({
  eventStatus: EventStatusSchema.optional(),
});

export type TEventUpdatePayload = z.infer<typeof EventUpdateSchema>;

export const querySchema = z.object({
  // Pagination
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'Page must be at least 1'))
    .optional(),

  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100, 'Limit must be between 1 and 100'))
    .optional(),

  // Location
  distance: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().positive('Distance must be a positive number'))
    .optional(),

  lng: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .min(-180, 'Longitude must be >= -180')
        .max(180, 'Longitude must be <= 180')
    ),

  lat: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(
      z
        .number()
        .min(-90, 'Latitude must be >= -90')
        .max(90, 'Latitude must be <= 90')
    ),

  startDate: z
    .string()
    .regex(isoUtcRegex, {
      message: "Invalid UTC date format. Must end with 'Z'",
    })
    .pipe(z.coerce.date())
    .optional(),

  // Max Orcas
  maxOrcas: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'maxOrcas must be at least 1'))
    .optional(),

  // eventType as UUID
  eventType: z.uuid({ message: 'eventType must be a valid UUID' }).optional(),
  search: z.string().optional(),
});

export type EventQueryParams = z.infer<typeof querySchema>;

export const UpdateEventInformationSchema = z.object({
  eventName: z
    .string({ error: 'eventName is required' })
    .min(3, { message: 'eventName must be at least 3 characters' })
    .max(100, { message: 'eventName must not exceed 100 characters' })
    .trim()
    .optional(),

  description: z
    .string({ error: 'description is required' })
    .min(10, { message: 'description must be at least 10 characters' })
    .max(1000, { message: 'description must not exceed 1000 characters' })
    .trim()
    .optional(),

  maxParticipantsCount: z
    .number({ error: 'maxParticipantsCount must be a number' })
    .int({ message: 'maxParticipantsCount must be an integer' })
    .min(10, { message: 'maxParticipantsCount must be at least 2' })
    .optional(),
});

export type TUpdateEventInformationPayload = z.infer<
  typeof UpdateEventInformationSchema
>;

export const SubmitEventJournalSchema = z.object({
  participantId: z.string({ error: 'participantId is required' }),
  rating: z
    .number({ error: 'rating must be a number' })
    .int({ message: 'rating must be an integer' })
    .min(1, { message: 'rating must be at least 1' })
    .max(5, { message: 'rating must not exceed 5' }),
});

export type TSubmitEventJournalPayload = z.infer<
  typeof SubmitEventJournalSchema
>;
