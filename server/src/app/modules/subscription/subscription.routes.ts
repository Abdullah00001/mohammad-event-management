import { Router } from 'express';

import {
  createSubscriptionPlanController,
  retrieveSubscriptionFeaturesController,
} from '@/app/modules/subscription/subscription.controllers';
import { PlanSchema } from '@/app/modules/subscription/subscription.schemas';
import { checkAdminAccessToken } from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/subscriptions/features')
  .get(checkAdminAccessToken, retrieveSubscriptionFeaturesController);

router
  .route('/admin/subscriptions/plan')
  .post(
    checkAdminAccessToken,
    validateReqBody(PlanSchema),
    createSubscriptionPlanController
  );

export default router;
