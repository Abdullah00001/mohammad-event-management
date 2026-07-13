import logger from '@/app/configs/logger.configs';
import { registerStrikeResetJob } from '@/app/jobs/strike-reset.job';
import { registerEventStatusJob } from '@/app/jobs/event-status.job';
import { registerEventReminderJob } from '@/app/jobs/event-reminder.job';

registerStrikeResetJob();
registerEventStatusJob();
registerEventReminderJob();
logger.info('[Corn] Schedules registered');
