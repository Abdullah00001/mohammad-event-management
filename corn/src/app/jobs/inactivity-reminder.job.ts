import cron from 'node-cron';
import logger from '@/app/configs/logger.configs';
import prisma from '@/app/configs/db.configs';
import { getPushNotificationQueue, getEmailQueue } from '@/app/queues/queues';

const TAG = '[InactivityReminderJob]';

/**
 * Runs daily at 10:00 to remind users who haven't opened the app in > 3 days.
 */
export function registerInactivityReminderJob(): void {
  cron.schedule('0 10 * * *', async () => {
    try {
      logger.info(`${TAG} Running inactivity reminder check`);

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      // Find users inactive for > 3 days, and who haven't received this reminder in the last 3 days
      const users = await prisma.user.findMany({
        where: {
          accountStatus: 'ACTIVE',
          lastActiveAt: { lt: threeDaysAgo },
          OR: [
            { lastInactivityReminder: null },
            { lastInactivityReminder: { lt: threeDaysAgo } },
          ],
        },
        include: {
          userPreference: true,
          devices: { select: { fcmToken: true } },
        },
      });

      if (users.length === 0) {
        return;
      }

      logger.info(`${TAG} Found ${users.length} inactive user(s) to remind`);

      const pushQueue = getPushNotificationQueue();
      const emailQueue = getEmailQueue();
      const notifiedUserIds: string[] = [];

      for (const user of users) {
        const pref = user.userPreference;
        const wantsPush = pref?.pushNotifications ?? true;
        const wantsEmail = pref?.emailNotification ?? true;

        if (!wantsPush && !wantsEmail) continue;

        const pushTokens = user.devices.map((d) => d.fcmToken).filter(Boolean);
        let notified = false;

        if (wantsPush && pushTokens.length > 0) {
          await pushQueue.add('send-multicast', {
            jobName: 'send-multicast',
            tokens: pushTokens,
            payload: {
              title: 'We Miss You!',
              body: 'You might be missing out on exciting events and pods nearby. Open the app to see what is new!',
              data: { type: 'INACTIVITY_REMINDER' },
            },
            traceId: `inactivity-reminder-${user.id}-${Date.now()}`,
          });
          notified = true;
        }

        if (wantsEmail && user.email) {
          await emailQueue.add('send-inactivity-email', {
            email: user.email,
            traceId: `inactivity-email-${user.id}-${Date.now()}`,
          });
          notified = true;
        }

        if (notified) {
          notifiedUserIds.push(user.id);
        }
      }

      if (notifiedUserIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: notifiedUserIds } },
          data: { lastInactivityReminder: now },
        });
        logger.info(`${TAG} Updated lastInactivityReminder for ${notifiedUserIds.length} users`);
      }

    } catch (error) {
      logger.error(`${TAG} Failed to run inactivity reminder job`, { error });
    }
  });

  logger.info(`${TAG} Registered — runs daily at 10:00`);
}
