import { Queue } from 'bullmq';

import { createQueueOptions } from '@/app/configs/queue.configs';

let _emailQueue: Queue | null = null;

export const getEmailQueue = () => {
  if (!_emailQueue) {
    // This will now only run AFTER connectRedis() has been called in server.ts
    _emailQueue = new Queue('email-queue', createQueueOptions());
  }
  return _emailQueue;
};

