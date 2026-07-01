import { Namespace } from 'socket.io';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';
import registerHandler from '@/app/sockets/helpers/registerHandler.helper';
import { notificationEventRegistry } from '@/app/sockets/events/notification.events';

const notificationNamespace = (notification: Namespace): void => {
  
  notification.on('connection', (socket) => {
    const user = socket as AuthenticatedSocket;
    logger.info(
      `Notification Namespace Connected: ${user.id} | userId: ${user.user?.id}`
    );
    if (user.user?.id) socket.join(`user_${user.user.id}`);

    registerHandler({ socket, events: notificationEventRegistry });

    socket.on('disconnect', () => {
      logger.info(`Notification Namespace Disconnected: ${user.id}`);
    });
  });
  return;
};

export default notificationNamespace;
