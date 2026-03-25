import { Router, raw } from 'express';

import {
  createSubscriptionPlanController,
  deleteSubscriptionPlanController,
  retrieveSingleSubscriptionPlanController,
  retrieveSubscriptionFeaturesController,
  retrieveSubscriptionPlansController,
  stripePaymentIntentController,
  stripeWebhookController,
  updateSubscriptionPlanController,
} from '@/app/modules/subscription/subscription.controllers';
import { findPlanById } from '@/app/modules/subscription/subscription.middlewares';
import { PlanSchema } from '@/app/modules/subscription/subscription.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
  checkAdminAccessToken,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * =============================================
 * ------------- PAYMENT WEBHOOKS --------------
 * =============================================
 */

router.route('/webhooks/payment/stripe').post(
  raw({ type: 'application/json' }), // ← raw body REQUIRED for signature check
  stripeWebhookController
);

/**
 * =============================================
 * -------------- USER ENDPOINTS ---------------
 * =============================================
 */

router.route('/subscriptions/plan').get(retrieveSubscriptionPlansController);

router
  .route('/subscriptions/intent/:planId')
  .post(
    checkAccessToken,
    checkAccountStatus,
    findPlanById,
    stripePaymentIntentController
  );

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
  .get(
    checkAdminAccessToken,
    findPlanById,
    retrieveSingleSubscriptionPlanController
  )
  .put(checkAdminAccessToken, findPlanById, updateSubscriptionPlanController)
  .delete(
    checkAdminAccessToken,
    findPlanById,
    deleteSubscriptionPlanController
  );

export default router;
