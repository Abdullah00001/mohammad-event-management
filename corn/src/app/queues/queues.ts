import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';

let _systemQueue: Queue | null = null;
let _pushNotificationQueue: Queue | null = null;

export const getSystemQueue = (): Queue => {
  if (!_systemQueue) {
    _systemQueue = new Queue('system-queue', createQueueOptions());
  }
  return _systemQueue;
};

export const getPushNotificationQueue = (): Queue => {
  if (!_pushNotificationQueue) {
    _pushNotificationQueue = new Queue('push-notification-queue', createQueueOptions());
  }
  return _pushNotificationQueue;
};
