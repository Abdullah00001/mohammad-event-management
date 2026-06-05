import { Namespace } from 'socket.io';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';

const chatNamespace = (chat: Namespace): void => {
  chat.on('connection', (socket) => {
    const user = socket as AuthenticatedSocket;
    logger.info(
      `Chat Namespace Connected: ${user.id} | userId: ${user.user?.id}`
    );
    if (user.user?.id) socket.join(`user_${user.user.id}`);

    socket.on('disconnect', () => {
      logger.info(`Chat Namespace Disconnected: ${user.id}`);
    });
  });
  return;
};

export default chatNamespace;
