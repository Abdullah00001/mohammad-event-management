import cron from 'node-cron';

import logger from '@/app/configs/logger.configs';
import prisma from '@/app/configs/db.configs';
import { getSystemQueue } from '@/app/queues/queues';

const TAG = '[EventStatusJob]';

/**
 * Runs every 5 minutes to transition event statuses.
 * UPCOMING -> ONGOING (when startDate <= now)
 * ONGOING -> COMPLETED (when endDate <= now)
 */
export function registerEventStatusJob(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info(`${TAG} Running event status check`);
      const now = new Date();
      const systemQueue = getSystemQueue();

      // 1. UPCOMING -> ONGOING (only if endDate > now)
      const upcomingEvents = await prisma.event.findMany({
        where: {
          eventStatus: 'UPCOMING' as any,
          startDate: { lte: now },
          endDate: { gt: now },
        },
        select: { id: true },
      });

      if (upcomingEvents.length > 0) {
        const startJobs = upcomingEvents.map((event: any) =>
          systemQueue.add('update-event-status', {
            eventId: event.id,
            targetStatus: 'ONGOING',
            traceId: `status-ongoing-${event.id}-${Date.now()}`,
          })
        );
        await Promise.all(startJobs);
        logger.info(`${TAG} Enqueued ${upcomingEvents.length} events to start (ONGOING)`);
      }

      // 2. UPCOMING/ONGOING -> COMPLETED
      const completedEvents = await prisma.event.findMany({
        where: {
          eventStatus: { in: ['UPCOMING', 'ONGOING'] as any[] },
          endDate: { lte: now },
        },
        select: { id: true },
      });

      if (completedEvents.length > 0) {
        const completeJobs = completedEvents.map((event: any) =>
          systemQueue.add('update-event-status', {
            eventId: event.id,
            targetStatus: 'COMPLETED',
            traceId: `status-completed-${event.id}-${Date.now()}`,
          })
        );
        await Promise.all(completeJobs);
        logger.info(`${TAG} Enqueued ${completedEvents.length} events to end (COMPLETED)`);
      }

    } catch (error) {
      logger.error(`${TAG} Failed to run event status job`, { error });
    }
  });

  logger.info(`${TAG} Registered — runs every 5 minutes`);
}
