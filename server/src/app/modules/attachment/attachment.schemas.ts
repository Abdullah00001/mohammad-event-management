import { z } from 'zod';

export const deleteAttachmentSchema = z
  .object({
    key: z
      .string({ message: 'Attachment key must be a string' })
      .min(1, 'Attachment key is required'),
  })
  .strict();