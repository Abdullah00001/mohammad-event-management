import { Redis } from 'ioredis';
import { Namespace } from 'socket.io';

import { env } from '@/env';
import logger from '@/app/configs/logger.configs';
import { SOCKET_EVENTS } from '@/const';
import prisma from '@/app/configs/db.configs';

let redisSubscriber: Redis | null = null;

export const initializeRedisPubSub = (notificationNameSpace: Namespace) => {
  if (!redisSubscriber) {
    redisSubscriber = new Redis({
      host: env.REDIS_HOST,
      password: env.REDIS_PASSWORD,
      port: env.REDIS_PORT || 6379,
    });

    redisSubscriber.subscribe('socket:notification', (err: any) => {
      if (err) {
        logger.error('Failed to subscribe to socket:notification channel', err);
      } else {
        logger.info('Subscribed to socket:notification channel');
      }
    });

    redisSubscriber.on('message', (channel: string, message: string) => {
      if (channel === 'socket:notification') {
        try {
          const parsed = JSON.parse(message);
          
          if (parsed.type === 'NEW_NOTIFICATION' && parsed.notifications && Array.isArray(parsed.notifications)) {
            parsed.notifications.forEach((notification: any) => {
              const userId = notification.userId;
              // Emit event for new in-app notification
              notificationNameSpace.to(`user_${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notification);
              
              // Also emit the updated count
              prisma.notification.count({
                where: { userId, isRead: false },
              }).then(count => {
                notificationNameSpace.to(`user_${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_COUNT_RESPONSE, { count });
              }).catch(err => {
                logger.error(`Error fetching unread count for user ${userId}`, err);
              });
            });
          }
        } catch (err) {
          logger.error('Error processing socket:notification message', err);
        }
      }
    });
  }
};
