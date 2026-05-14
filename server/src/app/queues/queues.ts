import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';

let _emailQueue: Queue | null = null;
let systemQueue: Queue | null = null;

export const getEmailQueue = () => {
  if (!_emailQueue) {
    _emailQueue = new Queue('email-queue', createQueueOptions());
  }
  return _emailQueue;
};

export const getSystemQueue = () => {
  if (!systemQueue) {
    systemQueue = new Queue('system-queue', createQueueOptions());
  }
  return systemQueue;
};
