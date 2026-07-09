import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';

export const handleNotificationMarkRead = async (
  socket: AuthenticatedSocket,
  data: { notificationId: string }
) => {
  const userId = socket.user?.id;
  await prisma.notification.updateMany({
    where: { id: data.notificationId, userId },
    data: { isRead: true },
  });
  socket.emit(SOCKET_EVENTS.NOTIFICATION_READ, {
    notificationId: data.notificationId,
  });
};

export const handleNotificationMarkAllRead = async (
  socket: AuthenticatedSocket
) => {
  const userId = socket.user?.id;
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  socket.emit(SOCKET_EVENTS.NOTIFICATION_ALL_READ, {});
};
