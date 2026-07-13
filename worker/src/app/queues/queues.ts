import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';

let _pushNotificationQueue: Queue | null = null;

export const getPushNotificationQueue = (): Queue => {
  if (!_pushNotificationQueue) {
    _pushNotificationQueue = new Queue('push-notification-queue', createQueueOptions());
  }
  return _pushNotificationQueue;
};
