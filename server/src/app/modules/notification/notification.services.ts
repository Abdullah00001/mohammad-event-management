import prisma from '@/app/configs/db.configs';
import { NotificationType, User } from '@prisma/client';
import { DEFAULT_LIMIT, DEFAULT_PAGE, SOCKET_EVENTS } from '@/const';
import { TNotificationQueryParams } from '@/app/modules/notification/notification.schemas';
import { notificationNameSpace } from '@/app/configs/socket.config';
import { CreateNotificationParams } from '@/app/modules/notification/notification.types';
import logger from '@/app/configs/logger.configs';

export const getNotificationsService = async ({
  userId,
  query,
}: {
  userId: string;
  query: TNotificationQueryParams;
}): Promise<unknown> => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = query;
    const offset = (page - 1) * limit;

    // ── 1. Fetch notifications + total count ──────────────────────
    const [rawNotifications, totalCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          notificationTitle: true,
          notificationDescription: true,
          type: true,
          metadata: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),

      prisma.notification.count({
        where: { userId },
      }),
    ]);

    // ── 2. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: rawNotifications,
      meta: {
        totalNotifications: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get notification service');
  }
};

export const deleteNotificationService = async ({
  id,
  user,
}: {
  user: User;
  id: string;
}) => {
  try {
    await prisma.notification.delete({
      where: {
        id,
        userId: user.id,
      },
    });
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in delete notification service');
  }
};

export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    title,
    description,
    type,
    metadata = {},
    emitSocket = true,
  } = params;

  // 1. Save to database
  const notification = await prisma.notification.create({
    data: {
      userId,
      notificationTitle: title,
      notificationDescription: description,
      type,
      metadata,
    },
  });

  // 2. Emit via socket if enabled
  if (emitSocket) {
    // a) Emit the new notification payload
    notificationNameSpace
      .to(`user_${userId}`)
      .emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);

    // b) Emit the updated unread count
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    notificationNameSpace
      .to(`user_${userId}`)
      .emit(SOCKET_EVENTS.NOTIFICATION_COUNT_RESPONSE, { count: unreadCount });

    logger.debug(`[Socket] Notification sent to user ${userId}: ${title}`);
  }

  // 3. TODO: Push notification (FCM) – will be added later

  return notification;
}

/**
 * Bulk create notifications for multiple users (e.g., event completion).
 * Emits to each user individually with their own notification.
 */
export async function createBulkNotifications(params: {
  userIds: string[];
  title: string;
  description: string;
  type: NotificationType;
  metadata?: Record<string, any>;
  emitSocket?: boolean;
}) {
  const {
    userIds,
    title,
    description,
    type,
    metadata = {},
    emitSocket = true,
  } = params;

  if (userIds.length === 0) return [];

  // Bulk insert
  const notificationData = userIds.map((userId) => ({
    userId,
    notificationTitle: title,
    notificationDescription: description,
    type,
    metadata,
  }));

  await prisma.notification.createMany({
    data: notificationData,
    skipDuplicates: true,
  });

  // Emit to each user (we could fetch the created records if needed,
  // but for efficiency we send a minimal payload)
  if (emitSocket) {
    const now = new Date();
    // For each user, emit the notification and their updated count
    for (const userId of userIds) {
      // Emit notification
      notificationNameSpace
        .to(`user_${userId}`)
        .emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
          // Minimal payload – the client can fetch full list via REST
          notificationTitle: title,
          notificationDescription: description,
          type,
          metadata,
          isRead: false,
          createdAt: now,
          // We can include a temporary id (or let the client ignore)
        });

      // Emit updated count
      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });
      notificationNameSpace
        .to(`user_${userId}`)
        .emit(SOCKET_EVENTS.NOTIFICATION_COUNT_RESPONSE, {
          count: unreadCount,
        });
    }
  }

  // Return the created records if needed – you can query them again, but for bulk we skip.
  return { count: userIds.length };
}
