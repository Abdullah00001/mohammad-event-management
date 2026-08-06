import { NotificationType } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  description: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  emitSocket?: boolean; // default true
}
