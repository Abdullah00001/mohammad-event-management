// server/src/app/sockets/schemas/notification.schema.ts
import { z } from 'zod';

export const notificationMarkReadSchema = z.object({
  notificationId: z.uuid(),
});

export const notificationMarkAllReadSchema = z.object({});

export type NotificationMarkReadPayload = z.infer<
  typeof notificationMarkReadSchema
>;
export type NotificationMarkAllReadPayload = z.infer<
  typeof notificationMarkAllReadSchema
>;
