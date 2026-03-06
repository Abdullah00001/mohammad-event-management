import { z } from 'zod';

export const interestSchema = z.object({
  interestName: z.string({
    message: 'Blog title is required and must be a string',
  }),
});
