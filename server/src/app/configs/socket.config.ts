import { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';
import { socketAuthMiddleware } from '@/app/middlewares/socket.middlewares';
import { corsWhiteList } from '@/const';

export let io: Server;

const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: corsWhiteList,
      methods: ['POST', 'GET'],
      credentials: true,
    },
  });
  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    const s = socket as AuthenticatedSocket;
    logger.info(`Socket Connected: ${s.id} | userId: ${s.user?.id}`);

    s.on('disconnect', () => {
      logger.info(`Socket Disconnected: ${s.id}`);
    });
  });

  const chatNameSpace = io.of('/chat');
  const notificationNameSpace = io.of('/notification');

  chatNameSpace.use(socketAuthMiddleware);
  notificationNameSpace.use(socketAuthMiddleware);

  notificationNameSpace.on('connection', (socket) => {
    const s = socket as AuthenticatedSocket;
    logger.info(`Notification NS Connected: ${s.id} | userId: ${s.user?.id}`);

    // Personal room for targeted pushes:
    // notificationNameSpace.to(userId).emit('notification', payload)
    if (s.user?.id) s.join(s.user.id);

    s.on('disconnect', () => {
      logger.info(`Notification NS Disconnected: ${s.id}`);
    });
  });

  chatNameSpace.on('connection', (socket) => {
    const s = socket as AuthenticatedSocket;
    logger.info(`Chat NS Connected: ${s.id} | userId: ${s.user?.id}`);

    if (s.user?.id) s.join(s.user.id);

    s.on('disconnect', () => {
      logger.info(`Chat NS Disconnected: ${s.id}`);
    });
  });

  return io;
};

export default initializeSocket;
