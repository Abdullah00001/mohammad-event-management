import { Server as HttpServer } from 'node:http';

import { Namespace, Server } from 'socket.io';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import logger from '@/app/configs/logger.configs';
import {
  socketAuthMiddleware,
  socketTraceMiddleware,
} from '@/app/middlewares/socket.middlewares';
import { corsWhiteList } from '@/const';
import { chatNamespace, notificationNamespace } from '@/app/sockets/namespace';
import { baseUrl } from '@/const';

export let io: Server;
export let chatNameSpace: Namespace;
export let notificationNameSpace: Namespace;

const initializeSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: corsWhiteList,
      methods: ['POST', 'GET'],
      credentials: true,
    },
  });

  io.use(socketTraceMiddleware);
  io.use(socketAuthMiddleware);
  io.on('connection', (socket) => {
    const s = socket as AuthenticatedSocket;
    logger.info(`Socket Connected: ${s.id} | userId: ${s.user?.id}`);

    s.on('disconnect', () => {
      logger.info(`Socket Disconnected: ${s.id}`);
    });
  });

  chatNameSpace = io.of(`${baseUrl.v1}/chat`);
  notificationNameSpace = io.of(`${baseUrl.v1}/notification`);

  chatNameSpace.use(socketTraceMiddleware);
  chatNameSpace.use(socketAuthMiddleware);
  notificationNameSpace.use(socketTraceMiddleware);
  notificationNameSpace.use(socketAuthMiddleware);

  chatNamespace(chatNameSpace);
  notificationNamespace(notificationNameSpace);

  return io;
};

export default initializeSocket;
