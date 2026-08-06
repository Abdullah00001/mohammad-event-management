import { Router } from 'express';

import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import {
  deleteNotificationController,
  getNotificationsController,
} from '@/app/modules/notification/notification.controllers';
import { checkIsNotificationExists } from './notification.middlewares';
import { validateReqQuery } from '@/app/utils/system.utils';
import { notificationQuerySchema } from '@/app/modules/notification/notification.schemas';

const router = Router();

router
  .route('/notifications')
  .get(
    checkAccessToken,
    checkAccountStatus,
    validateReqQuery(notificationQuerySchema),
    getNotificationsController
  );

router
  .route('/notifications/:id')
  .delete(
    checkAccessToken,
    checkAccountStatus,
    checkIsNotificationExists,
    deleteNotificationController
  );

export default router;
