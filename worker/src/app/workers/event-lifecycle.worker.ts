import { Worker, Job } from 'bullmq';
import { getEventLifecycleQueue } from '@/app/queues/queues';
import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import prisma from '@/app/configs/db.configs';
import {
  EEventLifecycleJobName,
  TEventLifecycleJobData,
} from '@/app/@types/queue.types';
import { StrikeReason } from '@prisma/client';

const TAG = '[EventLifecycleWorker]';

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export const createEventLifecycleWorker = (): Worker => {
  const queue = getEventLifecycleQueue();
  const redis = getRedisClient() as any;

  const worker = new Worker<TEventLifecycleJobData, void, string>(
    queue.name,
    async (job: Job<TEventLifecycleJobData, void, string>) => {
      const { jobName, payload } = job.data;
      const { eventId } = payload;
      logger.info(`${TAG} Processing ${jobName} for event ${eventId}`);

      try {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          include: {
            eventParticipants: {
              where: {
                leftAt: null, // Only active participants
              },
            },
          },
        });

        if (!event) {
          logger.warn(`${TAG} Event ${eventId} not found`);
          return;
        }

        const participants = event.eventParticipants;

        if (jobName === EEventLifecycleJobName.EVENT_START) {
          for (const p of participants) {
            if (p.isPresent) continue;
            
            const locationStr = await redis.get(`user:location:${p.participantId}`);
            if (locationStr) {
              try {
                const loc = JSON.parse(locationStr);
                const distance = getDistanceInMeters(event.lat, event.lng, loc.lat, loc.lng);
                
                if (distance <= 15000) {
                  await prisma.eventParticipants.update({
                    where: { id: p.id },
                    data: { isPresent: true },
                  });
                  logger.info(`${TAG} User ${p.participantId} is present at start for event ${eventId}`);
                }
              } catch (e) {
                logger.error(`${TAG} Failed to parse location for user ${p.participantId}`, e);
              }
            }
          }
        } else if (jobName === EEventLifecycleJobName.EVENT_END) {
          for (const p of participants) {
            if (p.isPresent) continue;
            
            const locationStr = await redis.get(`user:location:${p.participantId}`);
            if (locationStr) {
              try {
                const loc = JSON.parse(locationStr);
                const distance = getDistanceInMeters(event.lat, event.lng, loc.lat, loc.lng);
                
                if (distance <= 15000) {
                  await prisma.eventParticipants.update({
                    where: { id: p.id },
                    data: { isPresent: true },
                  });
                  logger.info(`${TAG} User ${p.participantId} is present at end for event ${eventId}`);
                  continue; 
                }
              } catch (e) {
                logger.error(`${TAG} Failed to parse location for user ${p.participantId}`, e);
              }
            }

            logger.info(`${TAG} Applying NO_SHOW for user ${p.participantId} in event ${eventId}`);

            await prisma.$transaction(async (tx) => {
              const user = await tx.user.findUnique({
                where: { id: p.participantId },
                include: { orcaGraceToken: true },
              });

              if (!user) return;

              const now = new Date();
              let usedGraceToken = false;

              if (user.orcaGraceToken) {
                const token = user.orcaGraceToken;
                // If not used, OR if it's already past the reset date (lazy reset)
                if (!token.isUsed || token.resetsAt < now) {
                  await tx.orcaGraceToken.update({
                    where: { id: token.id },
                    data: {
                      isUsed: true,
                      usedAt: now,
                      // If it was already past reset, we should push reset to next month, 
                      // but typically subscriptions handle the resetsAt via webhooks.
                      // We'll leave resetsAt alone assuming it's managed by the billing cycle.
                    },
                  });
                  usedGraceToken = true;
                  logger.info(`${TAG} User ${user.id} bypassed NO_SHOW via Orca Grace Token`);
                }
              }

              if (!usedGraceToken) {
                await tx.strike.create({
                  data: {
                    userId: user.id,
                    points: 2,
                    reason: StrikeReason.NO_SHOW,
                  },
                });

                const updatedStrikeCount = user.strikeCount + 2;
                let penaltyEndDate: Date | null = null;

                if (updatedStrikeCount >= 5) {
                  penaltyEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                } else if (updatedStrikeCount >= 3) {
                  penaltyEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                }

                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    strikeCount: updatedStrikeCount,
                    lastStrikeDate: now,
                    ...(penaltyEndDate && { penaltyEndDate }),
                  },
                });

                logger.info(`${TAG} User ${user.id} received 2 strikes for NO_SHOW. Total: ${updatedStrikeCount}`);
              }

              await tx.eventParticipants.update({
                where: { id: p.id },
                data: { noShow: true },
              });
            });
          }
        }
      } catch (err) {
        logger.error(`${TAG} Error processing ${jobName} for event ${eventId}`, err);
        throw err;
      }
    },
    { connection: redis }
  );

  worker.on('failed', (job, err) => {
    logger.error(`${TAG} Job ${job?.id} failed`, err);
  });

  return worker;
};
