import { Router } from 'express';

import { createSubscriptionPlanController, retrieveSubscriptionFeaturesController } from '@/app/modules/subscription/subscription.controllers';
import { checkAdminAccessToken } from '@/app/modules/user/user.middlewares';

const router = Router();

router
  .route('/subscriptions/features')
  .get(checkAdminAccessToken, retrieveSubscriptionFeaturesController);

router
  .route('/admin/subscriptions')
  .post(checkAdminAccessToken, createSubscriptionPlanController);

export default router;
