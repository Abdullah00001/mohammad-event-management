import cron from 'node-cron';
import logger from '@/app/configs/logger.configs';
import prisma from '@/app/configs/db.configs';
import { getPushNotificationQueue, getEmailQueue } from '@/app/queues/queues';

const TAG = '[UnreadMessagesReminderJob]';

/**
 * Runs daily at 18:00 to remind users who have > 5 unread conversations.
 */
export function registerUnreadMessagesReminderJob(): void {
  cron.schedule('0 18 * * *', async () => {
    try {
      logger.info(`${TAG} Running unread messages reminder check`);

      const users = await prisma.user.findMany({
        where: {
          accountStatus: 'ACTIVE',
        },
        include: {
          userPreference: true,
          devices: { select: { fcmToken: true } },
          conversationParticipants: {
            include: {
              conversation: {
                include: {
                  messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
          conversationSettings: true,
        },
      });

      const pushQueue = getPushNotificationQueue();
      const emailQueue = getEmailQueue();
      let totalReminders = 0;

      for (const user of users) {
        const pref = user.userPreference;
        const wantsPush = pref?.pushNotifications ?? true;
        const wantsEmail = pref?.emailNotification ?? true;

        if (!wantsPush && !wantsEmail) continue;

        let unreadCount = 0;

        for (const cp of user.conversationParticipants) {
          const latestMessage = cp.conversation.messages[0];
          if (!latestMessage) continue;

          // Don't count if the user sent the latest message
          if (latestMessage.senderId === user.id) continue;

          // Find the user's settings for this conversation
          const settings = user.conversationSettings.find(
            (cs) => cs.conversationId === cp.conversationId
          );

          const clearedAt = settings?.clearedAt;

          if (!clearedAt || latestMessage.createdAt > clearedAt) {
            unreadCount++;
          }
        }

        if (unreadCount > 5) {
          const pushTokens = user.devices.map((d) => d.fcmToken).filter(Boolean);

          if (wantsPush && pushTokens.length > 0) {
            await pushQueue.add('send-multicast', {
              jobName: 'send-multicast',
              tokens: pushTokens,
              payload: {
                title: 'Unread Messages',
                body: `You have ${unreadCount} unread conversations waiting for you.`,
                data: { type: 'UNREAD_REMINDER' },
              },
              traceId: `unread-reminder-${user.id}-${Date.now()}`,
            });
          }

          if (wantsEmail && user.email) {
            await emailQueue.add('send-unread-messages-email', {
              email: user.email,
              unreadCount,
              traceId: `unread-reminder-email-${user.id}-${Date.now()}`,
            });
          }

          totalReminders++;
        }
      }

      logger.info(`${TAG} Sent unread reminders to ${totalReminders} users`);
    } catch (error) {
      logger.error(`${TAG} Failed to run unread messages reminder job`, { error });
    }
  });

  logger.info(`${TAG} Registered — runs daily at 18:00`);
}
