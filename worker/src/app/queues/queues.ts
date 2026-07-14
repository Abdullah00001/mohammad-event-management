import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';

let _pushNotificationQueue: Queue | null = null;
let _emailQueue: Queue | null = null;

export const getPushNotificationQueue = (): Queue => {
  if (!_pushNotificationQueue) {
    _pushNotificationQueue = new Queue('push-notification-queue', createQueueOptions());
  }
  return _pushNotificationQueue;
};

export const getEmailQueue = (): Queue => {
  if (!_emailQueue) {
    _emailQueue = new Queue('email-queue', createQueueOptions());
  }
  return _emailQueue;
};
