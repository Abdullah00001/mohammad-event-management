// modules/kyc/kyc.schemas.ts
import { z } from 'zod';

export const createKycSessionSchema = z.object({}).strict();

export type TCreateKycSessionPayload = z.infer<typeof createKycSessionSchema>;

export const submitKycSchema = z
  .object({
    sessionId: z.uuid({ message: 'Invalid sessionId format' }),
  })
  .strict();

export type TSubmitKycPayload = z.infer<typeof submitKycSchema>;
