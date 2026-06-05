import { Namespace } from 'socket.io';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';

const notificationNamespace = (notification: Namespace): void => {
  notification.on('connection', (socket) => {
    const user = socket as AuthenticatedSocket;
    logger.info(
      `Notification Namespace Connected: ${user.id} | userId: ${user.user?.id}`
    );
    if (user.user?.id) socket.join(`user_${user.user.id}`);

    socket.on('disconnect', () => {
      logger.info(`Notification Namespace Disconnected: ${user.id}`);
    });
  });
  return;
};

export default notificationNamespace;
