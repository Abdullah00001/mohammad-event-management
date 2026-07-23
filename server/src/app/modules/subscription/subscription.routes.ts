import { Router } from 'express';
import {
  getActivePlansController,
  getMySubscriptionPlanController,
  getFeaturesController,
  createFeatureController,
  updateFeatureController,
  getDeveloperPlansController,
  getSingleDeveloperPlanController,
  createSubscriptionPlanController,
  updateSubscriptionPlanController,
  syncSubscriptionController,
  webhookRevenueCatController,
} from './subscription.controllers';
import { validateReqBody } from '@/app/utils/system.utils';
import {
  CreateFeatureSchema,
  UpdateFeatureSchema,
  CreateSubscriptionPlanSchema,
  UpdateSubscriptionPlanSchema,
  RevenueCatWebhookSchema,
} from '@/app/modules/subscription/subscription.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
  checkAdminAccessToken,
  isAdmin,
} from '@/app/modules/user/user.middlewares';

const router = Router();

// --- Public ---
router.route('/plans').get(getActivePlansController);

// --- Mobile App ---
router.route('/app/plans').get(
  checkAccessToken,
  checkAccountStatus,
  getActivePlansController
);

router.route('/auth/plan').get(
  checkAccessToken,
  checkAccountStatus,
  getMySubscriptionPlanController
);

router.route('/auth/sync-subscription').post(
  checkAccessToken,
  checkAccountStatus,
  syncSubscriptionController
);

// --- Webhooks ---
router.route('/webhooks/revenuecat').post(
  validateReqBody(RevenueCatWebhookSchema),
  webhookRevenueCatController
);

// --- Admin ---
router.route('/admin/plans').get(
  checkAdminAccessToken,
  isAdmin,
  getDeveloperPlansController
);

router.route('/admin/plans/:id').patch(
  checkAdminAccessToken,
  isAdmin,
  validateReqBody(UpdateSubscriptionPlanSchema),
  updateSubscriptionPlanController
);

// --- Developer ---
router.route('/dev/features').get(
  checkAdminAccessToken,
  isAdmin,
  getFeaturesController
);

router.route('/dev/features').post(
  checkAdminAccessToken,
  isAdmin,
  validateReqBody(CreateFeatureSchema),
  createFeatureController
);

router.route('/dev/features/:id').patch(
  checkAdminAccessToken,
  isAdmin,
  validateReqBody(UpdateFeatureSchema),
  updateFeatureController
);

router.route('/dev/plans').get(
  checkAdminAccessToken,
  isAdmin,
  getDeveloperPlansController
);

router.route('/dev/plans').post(
  checkAdminAccessToken,
  isAdmin,
  validateReqBody(CreateSubscriptionPlanSchema),
  createSubscriptionPlanController
);

router.route('/dev/plans/:id').get(
  checkAdminAccessToken,
  isAdmin,
  getSingleDeveloperPlanController
);

router.route('/dev/plans/:id').patch(
  checkAdminAccessToken,
  isAdmin,
  validateReqBody(UpdateSubscriptionPlanSchema),
  updateSubscriptionPlanController
);

export default router;
