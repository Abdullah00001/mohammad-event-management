import { Namespace } from 'socket.io';
import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';
import registerHandler from '@/app/sockets/helpers/registerHandler.helper';
import { chatEventRegistry } from '@/app/sockets/events/chat.events';
import { globalSocketErrorMiddleware } from '@/app/middlewares/socket.middlewares';
import prisma from '@/app/configs/db.configs';

const chatNamespace = (chat: Namespace): void => {
  chat.on('connection', async (socket) => {
    const user = socket as AuthenticatedSocket;
    const userId = user.user?.id;
    logger.info(`Chat Namespace Connected: ${user.id} | userId: ${userId}`);

    if (userId) {
      // Join personal room (for future targeted events)
      socket.join(`user_${userId}`);

      // Auto‑join all active conversations where user is a participant (not soft‑deleted)
      const participants = await prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              settings: {
                where: { userId },
              },
            },
          },
        },
      });

      for (const p of participants) {
        const settings = p.conversation.settings[0];
        // Only join if not soft‑deleted for this user
        if (!settings?.deletedAt) {
          socket.join(`conversation:${p.conversationId}`);
        }
      }

      logger.debug(
        `User ${userId} auto‑joined ${participants.length} conversations`
      );
    }

    socket.on('error', (err) => {
      globalSocketErrorMiddleware(err, user);
    });

    registerHandler({ socket, events: chatEventRegistry });

    socket.on('disconnect', () => {
      logger.info(`Chat Namespace Disconnected: ${user.id}`);
    });
  });
};

export default chatNamespace;
