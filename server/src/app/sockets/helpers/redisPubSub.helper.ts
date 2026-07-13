import { Redis } from 'ioredis';
import { Namespace } from 'socket.io';

import { env } from '@/env';
import logger from '@/app/configs/logger.configs';
import { SOCKET_EVENTS } from '@/const';

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
          
          if (parsed.type === 'NEW_NOTIFICATION' && parsed.userIds && Array.isArray(parsed.userIds)) {
            parsed.userIds.forEach((userId: string) => {
              // Emit event for new in-app notification
              notificationNameSpace.to(`user_${userId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
                message: 'You have a new notification!',
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
