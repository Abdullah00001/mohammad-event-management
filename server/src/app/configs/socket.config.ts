import { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import logger from '@/app/configs/logger.configs';
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

  io.on('connection', (socket) => {
    logger.info(`Socket Connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket Disconnected: ${socket.id}`);
    });
  });

  const chatNameSpace = io.of('/chat');

  chatNameSpace.on('connection', (socket) => {
    logger.info(`Chat Namespace Connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Chat Namespace Disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default initializeSocket;
