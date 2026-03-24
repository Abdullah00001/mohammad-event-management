import { Router } from 'express';

import {
  createSubscriptionPlanController,
  deleteSubscriptionPlanController,
  retrieveSingleSubscriptionPlanController,
  retrieveSubscriptionFeaturesController,
  retrieveSubscriptionPlansController,
  updateSubscriptionPlanController,
} from '@/app/modules/subscription/subscription.controllers';
import { PlanSchema } from '@/app/modules/subscription/subscription.schemas';
import { checkAdminAccessToken } from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * =============================================
 * -------------- USER ENDPOINTS ---------------
 * =============================================
 */

router.route('/subscriptions/plan').get(retrieveSubscriptionPlansController);

/**
 * =============================================
 * ------------- ADMIN ENDPOINTS ---------------
 * =============================================
 */

router
  .route('/admin/subscriptions/features')
  .get(checkAdminAccessToken, retrieveSubscriptionFeaturesController);

router
  .route('/admin/subscriptions/plan')
  .post(
    checkAdminAccessToken,
    validateReqBody(PlanSchema),
    createSubscriptionPlanController
  )
  .get(checkAdminAccessToken, retrieveSubscriptionPlansController);

router
  .route('/admin/subscriptions/plan/:planId')
  .get(checkAdminAccessToken, retrieveSingleSubscriptionPlanController)
  .put(checkAdminAccessToken, updateSubscriptionPlanController)
  .delete(checkAdminAccessToken, deleteSubscriptionPlanController);

export default router;
