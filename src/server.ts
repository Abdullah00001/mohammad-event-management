import { createServer, type Server } from 'node:http';

import { config } from 'dotenv';

import app from '@/app';
import { connectDatabase } from '@/app/configs/db.configs';
import { connectRedis } from '@/app/configs/redis.config';
import { shutdown } from '@/app/utils/system.utils';

config();

const port: number = Number(process.env.PORT) || 5000;
const server: Server = createServer(app);

async function main(): Promise<void> {
  await connectRedis();
  await connectDatabase();
  server.listen(port, '0.0.0.0', () => {
    console.log(`Server Running On Port : ${port}`);
  });
}

main();

/**
 * Graceful signals
 */
process.on('SIGINT', () => shutdown({ reason: 'SIGINT', server }));
process.on('SIGTERM', () => shutdown({ reason: 'SIGTERM', server }));

/**
 * Fatal errors
 */
process.on('unhandledRejection', (error) =>
  shutdown({ reason: 'unhandledRejection', server, error })
);

process.on('uncaughtException', (error) =>
  shutdown({ reason: 'uncaughtException', server, error })
);
