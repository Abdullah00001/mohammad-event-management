import { Namespace } from 'socket.io';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';
import registerHandler from '@/app/sockets/helpers/registerHandler.helper';
import { notificationEventRegistry } from '@/app/sockets/events/notification.events';
import { globalSocketErrorMiddleware } from '@/app/middlewares/socket.middlewares';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';
import { initializeRedisPubSub } from '@/app/sockets/helpers/redisPubSub.helper';

const notificationNamespace = (notification: Namespace): void => {
  initializeRedisPubSub(notification);
  notification.on('connection', async (socket) => {
    const user = socket as AuthenticatedSocket;
    logger.info(
      `Notification Namespace Connected: ${user.id} | userId: ${user.user?.id}`
    );
    if (user.user?.id) {
      socket.join(`user_${user.user.id}`);
      const count = await prisma.notification.count({
        where: { userId: user.user.id, isRead: false },
      });
      socket.emit(SOCKET_EVENTS.NOTIFICATION_COUNT_RESPONSE, { count });
    }
    socket.on('error', (err) => {
      globalSocketErrorMiddleware(err, user);
    });
    registerHandler({ socket, events: notificationEventRegistry });

    socket.on('disconnect', () => {
      logger.info(`Notification Namespace Disconnected: ${user.id}`);
    });
  });
  return;
};

export default notificationNamespace;
