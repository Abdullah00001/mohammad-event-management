import { join } from 'path';

import { config } from 'dotenv';
import { Redis } from 'ioredis';

config({ path: join(process.cwd(), '.env') });

export const workerRedis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // ← required for BullMQ workers
  enableReadyCheck: true,
});

workerRedis.on('ready', () => console.log('[Worker Redis] Ready'));
workerRedis.on('error', (err) => console.error('[Worker Redis] Error:', err));
