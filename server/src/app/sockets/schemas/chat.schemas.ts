import { z } from 'zod';

export const eventChatMessageSchema = z
  .object({
    eventId: z.uuid({ error: 'Invalid Event ID' }),
    content: z
      .string({ error: 'Must be string' })
      .min(1, { message: 'Message cannot be empty' })
      .max(2000, { message: 'Message cannot exceed 2000 characters' }),
    attachments: z
      .array(
        z
          .url({ message: 'Invalid URL' })
          .refine((url) => url.startsWith('https://') && url.includes('.s3.'))
      )
      .max(10, { message: 'Maximum 10 attachments are allowed' })
      .optional(),
  })
  .strict();

export type TEventChatMessagePayload = z.infer<typeof eventChatMessageSchema>;
