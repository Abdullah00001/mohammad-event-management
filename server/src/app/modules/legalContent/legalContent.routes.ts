import { Router } from 'express';

import { validateReqBody } from '@/app/utils/system.utils';
import {
  getAboutUsController,
  getContactAndSupportController,
  getPrivacyPolicyController,
  getSubscriptionAndRefundPolicyController,
  getTermsAndConditionController,
  updateAboutUsController,
  updateContactAndSupportController,
  updatePrivacyPolicyController,
  updateSubscriptionAndRefundPolicyController,
  updateTermsAndConditionController,
} from '@/app/modules/legalContent/legalContent.controllers';
import { updateLegalContentSchema } from '@/app/modules/legalContent/legalContent.schemas';
import {
  checkAccountStatus,
  checkAdminAccessToken,
} from '@/app/modules/user/user.middlewares';

const router = Router();

// ── PRIVACY POLICY ──
router.route('/privacy-policy').get(getPrivacyPolicyController);
router
  .route('/admin/privacy-policy')
  .patch(
    checkAdminAccessToken,
    checkAccountStatus,
    validateReqBody(updateLegalContentSchema),
    updatePrivacyPolicyController
  );

// ── TERMS AND CONDITION ──
router.route('/terms-and-condition').get(getTermsAndConditionController);
router
  .route('/admin/terms-and-condition')
  .patch(
    checkAdminAccessToken,
    checkAccountStatus,
    validateReqBody(updateLegalContentSchema),
    updateTermsAndConditionController
  );

// ── ABOUT US ──
router.route('/about-us').get(getAboutUsController);
router
  .route('/admin/about-us')
  .patch(
    checkAdminAccessToken,
    checkAccountStatus,
    validateReqBody(updateLegalContentSchema),
    updateAboutUsController
  );

// ── SUBSCRIPTION AND REFUND POLICY ──
router
  .route('/subscription-and-refund-policy')
  .get(getSubscriptionAndRefundPolicyController);
router
  .route('/admin/subscription-and-refund-policy')
  .patch(
    checkAdminAccessToken,
    checkAccountStatus,
    validateReqBody(updateLegalContentSchema),
    updateSubscriptionAndRefundPolicyController
  );

// ── CONTACT AND SUPPORT ──
router.route('/contact-and-support').get(getContactAndSupportController);
router
  .route('/admin/contact-and-support')
  .patch(
    checkAdminAccessToken,
    checkAccountStatus,
    validateReqBody(updateLegalContentSchema),
    updateContactAndSupportController
  );

export default router;
