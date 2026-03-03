import { Worker } from 'bullmq';

import { EmailWorker } from '@/workers/email.workers';
import { workerRedis } from '@/workers/redis';

const TAG = '[BullMQ Worker]';
console.log(`${TAG} PID: ${process.pid}`);

const allWorkers: Worker[] = [EmailWorker];

const shutdown = async (signal: string) => {
  console.log(`${TAG} ${signal} — closing...`);
  await Promise.all(allWorkers.map((w) => w.close()));
  await workerRedis.quit();
  console.log(`${TAG} ✓ Clean shutdown`);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) =>
  console.error(`${TAG} Uncaught:`, err)
);
process.on('unhandledRejection', (r) => console.error(`${TAG} Rejection:`, r));
