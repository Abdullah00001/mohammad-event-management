import cron from 'node-cron';

import logger from '@/app/configs/logger.configs';
import prisma from '@/app/configs/db.configs';
import { getPushNotificationQueue } from '@/app/queues/queues';

const TAG = '[EventReminderJob]';

/**
 * Runs every 5 minutes to send reminders for events starting in ~1 hour.
 */
export function registerEventReminderJob(): void {
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info(`${TAG} Running event reminder check`);
      const now = new Date();
      
      // Events starting between 55 and 60 minutes from now
      const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 60 * 60 * 1000);

      const pushQueue = getPushNotificationQueue();

      const upcomingEvents = await prisma.event.findMany({
        where: {
          eventStatus: 'UPCOMING' as any,
          startDate: {
            gte: windowStart,
            lt: windowEnd,
          },
        },
        include: {
          eventParticipants: {
            where: { leftAt: null },
            include: {
              user: {
                include: {
                  devices: {
                    select: { fcmToken: true },
                  },
                },
              },
            },
          },
        },
      });

      if (upcomingEvents.length === 0) {
        return;
      }

      logger.info(`${TAG} Found ${upcomingEvents.length} event(s) starting soon`);

      const notificationJobs: Promise<any>[] = [];

      for (const event of upcomingEvents) {
        const tokens: string[] = [];
        
        event.eventParticipants.forEach((ep: any) => {
          ep.user.devices.forEach((device: any) => {
            if (device.fcmToken) {
              tokens.push(device.fcmToken);
            }
          });
        });

        if (tokens.length > 0) {
          notificationJobs.push(
            pushQueue.add('send-multicast', {
              jobName: 'send-multicast',
              tokens,
              payload: {
                title: 'Event Starting Soon!',
                body: `Reminder: ${event.eventName} starts in about 1 hour.`,
                data: {
                  eventId: event.id,
                  type: 'EVENT_REMINDER',
                },
              },
              traceId: `reminder-${event.id}-${Date.now()}`,
            })
          );
        }
      }

      if (notificationJobs.length > 0) {
        await Promise.all(notificationJobs);
        logger.info(`${TAG} Enqueued ${notificationJobs.length} multicast reminder job(s)`);
      }

    } catch (error) {
      logger.error(`${TAG} Failed to run event reminder job`, { error });
    }
  });

  logger.info(`${TAG} Registered — runs every 5 minutes`);
}
