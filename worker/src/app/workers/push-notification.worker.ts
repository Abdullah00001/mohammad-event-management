import { Job, Worker } from 'bullmq';
import { Message, MulticastMessage } from 'firebase-admin/messaging';

import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { requestContext } from '@/app/configs/requestContext.configs';
import { getFirebaseMessaging } from '@/app/configs/firebase.configs';
import {
  EPushNotificationJobName,
  TPushNotificationJobData,
} from '@/app/@types/queue.types';

export const createPushNotificationWorker = (): Worker<TPushNotificationJobData, void, string> => {
  const pushNotificationWorker = new Worker<
    TPushNotificationJobData,
    void,
    string
  >(
    'push-notification-queue',
    async (
      job: Job<TPushNotificationJobData, void, string>
    ) => {
      const { name, data, id } = job;
      const traceId = data.traceId ?? 'NO_TRACE_ID';

      return requestContext.run({ traceId }, async () => {
        try {
          const messaging = getFirebaseMessaging();
          if (!messaging) {
            throw new Error('Firebase Messaging is not initialized');
          }

          switch (name as EPushNotificationJobName) {
            case EPushNotificationJobName.SEND_TO_TOKEN: {
              if (data.jobName !== EPushNotificationJobName.SEND_TO_TOKEN) break;
              const message: Message = {
                token: data.token,
                notification: {
                  title: data.payload.title,
                  body: data.payload.body,
                  ...(data.payload.imageUrl && { imageUrl: data.payload.imageUrl }),
                },
                data: data.payload.data,
              };
              await messaging.send(message);
              break;
            }
            case EPushNotificationJobName.SEND_MULTICAST: {
              if (data.jobName !== EPushNotificationJobName.SEND_MULTICAST) break;
              if (!data.tokens.length) {
                logger.warn('Send multicast called with empty tokens array');
                break;
              }
              const multicastMessage: MulticastMessage = {
                tokens: data.tokens,
                notification: {
                  title: data.payload.title,
                  body: data.payload.body,
                  ...(data.payload.imageUrl && { imageUrl: data.payload.imageUrl }),
                },
                data: data.payload.data,
              };
              const response = await messaging.sendEachForMulticast(multicastMessage);
              if (response.failureCount > 0) {
                logger.warn(
                  `Multicast partially failed. Success: ${response.successCount}, Failure: ${response.failureCount}`
                );
              }
              break;
            }
            case EPushNotificationJobName.SEND_TO_TOPIC: {
              if (data.jobName !== EPushNotificationJobName.SEND_TO_TOPIC) break;
              const message: Message = {
                topic: data.topic,
                notification: {
                  title: data.payload.title,
                  body: data.payload.body,
                  ...(data.payload.imageUrl && { imageUrl: data.payload.imageUrl }),
                },
                data: data.payload.data,
              };
              await messaging.send(message);
              break;
            }
            default: {
              throw new Error(`Unhandled push notification job: ${name}`);
            }
          }
        } catch (error) {
          logger.error('Push notification worker job failed', {
            jobName: name,
            jobId: id,
            error,
          });
          throw error;
        }
      });
    },
    { connection: getRedisClient() as any }
  );

  pushNotificationWorker.on(
    'completed',
    (job: Job<TPushNotificationJobData, void, string>) => {
      const traceId = job.data.traceId ?? 'NO_TRACE_ID';
      requestContext.run({ traceId }, () => {
        logger.info(`Job Name: ${job.name} Job Id: ${job.id} Completed`);
      });
    }
  );

  pushNotificationWorker.on(
    'failed',
    (
      job: Job<TPushNotificationJobData, void, string> | undefined,
      error: Error
    ) => {
      if (!job) {
        logger.error(
          `A push notification job failed but the job data is undefined.\nError:\n${error}`
        );
        return;
      }
      const traceId = job.data.traceId ?? 'NO_TRACE_ID';
      requestContext.run({ traceId }, () => {
        logger.error(
          `Job Name: ${job.name} Job Id: ${job.id} Failed\nError:\n${error}`
        );
      });
    }
  );

  return pushNotificationWorker;
};
