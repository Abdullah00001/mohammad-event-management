import { Router } from 'express';

import { checkAccessToken } from '@/app/modules/user/user.middlewares';
import { getNotificationsController } from '@/app/modules/notification/notification.controllers';

const router = Router();

router
  .route('/notifications')
  .get(checkAccessToken, getNotificationsController);

export default router;
