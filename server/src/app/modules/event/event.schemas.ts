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

  startTime: z
    .string({ error: 'time is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)\s(AM|PM)$/, {
      message: 'time must be in HH:MM AM/PM format (e.g. 14:30 PM)',
    })
    .refine(
      (val) => {
        const [hourStr, , period] = val.split(/[:\s]/);
        const hour = parseInt(hourStr);
        return (
          (hour < 12 && period === 'AM') || (hour >= 12 && period === 'PM')
        );
      },
      { message: 'AM/PM must match the hour (00–11 → AM, 12–23 → PM)' }
    ),

  maxParticipantsCount: z
    .number({ error: 'maxParticipantsCount must be a number' })
    .int({ message: 'maxParticipantsCount must be an integer' })
    .min(10, { message: 'maxParticipantsCount must be at least 2' })
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

  // Date: DD/MM/YY
  date: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{2}$/, 'Date must be in DD/MM/YY format')
    .refine((val) => {
      const [dd, mm, yy] = val.split('/').map(Number);
      const fullYear = 2000 + yy;
      const parsed = new Date(fullYear, mm - 1, dd);
      return (
        parsed.getFullYear() === fullYear &&
        parsed.getMonth() === mm - 1 &&
        parsed.getDate() === dd
      );
    }, 'Date must be a valid calendar date')
    .optional(),

  // Time: HH/MM in 24-hour format
  time: z
    .string({ error: 'time is required' })
    .regex(/^(0[1-9]|1[0-2]):([0-5]\d)\s(AM|PM)$/, {
      message: 'time must be in HH:MM AM/PM format (e.g. 02:30 PM)',
    })
    .optional(),

  // Max Orcas
  maxOrcas: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'maxOrcas must be at least 1'))
    .optional(),

  // eventType as UUID
  eventType: z.uuid({ message: 'eventType must be a valid UUID' }).optional(),
});

export type EventQueryParams = z.infer<typeof querySchema>;
