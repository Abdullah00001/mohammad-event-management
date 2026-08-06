import cron from 'node-cron';

import logger from '@/app/configs/logger.configs';
import prisma from '@/app/configs/db.configs';
import { getSystemQueue } from '@/app/queues/queues';

const TAG = '[StrikeResetJob]';

/**
 * Daily cron job — runs at 03:00 AM every day.
 *
 * Finds users eligible for strike reset (strikeCount > 0 and
 * lastStrikeDate older than 90 days). Instead of doing database writes
 * directly, it pushes lightweight jobs to the `system-queue` so the
 * worker service handles the heavy lifting.
 */
export function registerStrikeResetJob(): void {
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info(`${TAG} Running daily strike reset check`);

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Find eligible users
      const eligibleUsers = await prisma.user.findMany({
        where: {
          strikeCount: { gt: 0 },
          lastStrikeDate: {
            lt: ninetyDaysAgo,
          },
        },
        select: { id: true, strikeCount: true },
      });

      if (eligibleUsers.length === 0) {
        logger.info(`${TAG} No users eligible for strike reset`);
        return;
      }

      logger.info(
        `${TAG} Found ${eligibleUsers.length} user(s) eligible for strike reset`
      );

      // Enqueue a job per user
      const systemQueue = getSystemQueue();
      const jobs = eligibleUsers.map((user: { id: string; strikeCount: number }) =>
        systemQueue.add('reset-user-strikes', {
          userId: user.id,
          previousStrikeCount: user.strikeCount,
          traceId: `strike-reset-${user.id}-${Date.now()}`,
        })
      );

      await Promise.all(jobs);
      logger.info(`${TAG} Enqueued ${eligibleUsers.length} reset jobs`);
    } catch (error) {
      logger.error(`${TAG} Failed to run strike reset job`, { error });
    }
  });

  logger.info(`${TAG} Registered — runs daily at 03:00 AM`);
}
