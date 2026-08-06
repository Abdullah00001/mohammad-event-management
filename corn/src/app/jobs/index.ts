import logger from '@/app/configs/logger.configs';
import { registerStrikeResetJob } from '@/app/jobs/strike-reset.job';
import { registerEventStatusJob } from '@/app/jobs/event-status.job';
import { registerEventReminderJob } from '@/app/jobs/event-reminder.job';
import { registerUnreadMessagesReminderJob } from '@/app/jobs/unread-messages-reminder.job';
import { registerInactivityReminderJob } from '@/app/jobs/inactivity-reminder.job';

registerStrikeResetJob();
registerEventStatusJob();
registerEventReminderJob();
registerUnreadMessagesReminderJob();
registerInactivityReminderJob();
logger.info('[Corn] Schedules registered');
