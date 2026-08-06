import { Worker, Job } from 'bullmq';
import { getSubscriptionWebhookQueue } from '@/app/queues/queues';
import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import prisma from '@/app/configs/db.configs';
import {
  TSubscriptionWebhookJobData,
} from '@/app/@types/queue.types';
import { syncUserSubscriptionService } from '@server/app/modules/subscription/subscription.services';

const TAG = '[RevenueCatWebhookWorker]';

export const createRevenueCatWebhookWorker = (): Worker => {
  const queue = getSubscriptionWebhookQueue();

  const worker = new Worker<
    TSubscriptionWebhookJobData,
    void,
    string
  >(
    queue.name,
    async (job: Job<TSubscriptionWebhookJobData, void, string>) => {
      logger.info(`${TAG} WEBHOOK_RECEIVED Processing job ${job.id} for RevenueCat Webhook`);

      try {
        const payload = job.data;
        const rcEventId = payload.event.id;
        
        // 1. Check idempotency
        const existingEvent = await prisma.revenueCatEvent.findUnique({
          where: { revenueCatEventId: rcEventId },
        });

        if (existingEvent) {
          logger.warn(`${TAG} WEBHOOK_DUPLICATE_IDEMPOTENCY Webhook event ${rcEventId} already processed. Skipping.`);
          return;
        }

        // 2. Log event to prevent replay
        await prisma.revenueCatEvent.create({
          data: {
            revenueCatEventId: rcEventId,
            eventType: payload.event.type,
            appUserId: payload.event.app_user_id,
          },
        });

        // 3. Trigger shared sync logic from server (persistence layer)
        await syncUserSubscriptionService(payload.event.app_user_id);
        
        logger.info(`${TAG} WEBHOOK_PROCESSED Webhook event ${rcEventId} processed successfully.`);
      } catch (err) {
        logger.error(`${TAG} Error processing webhook job ${job.id}`, { err });
        throw err;
      }
    },
    { connection: getRedisClient() as any }
  );

  worker.on('failed', (job, err) => {
    logger.error(`${TAG} Job ${job?.id} failed`, { err });
  });

  return worker;
};
