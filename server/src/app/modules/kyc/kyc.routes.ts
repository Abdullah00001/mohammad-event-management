import { Router, raw } from 'express';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import {
  createKycSessionController,
  getKycStatusController,
  handleKycWebhookController,
  submitKycController,
} from '@/app/modules/kyc/kyc.controllers';
import {
  checkActiveKycAttemptMiddleware,
  checkKycAttemptExistsMiddleware,
  verifyKycWebhookSignature,
} from '@/app/modules/kyc/kyc.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';
import {
  createKycSessionSchema,
  submitKycSchema,
} from '@/app/modules/kyc/kyc.schemas';

const router = Router();

router.route('/kyc/webhook').post(
  raw({ type: 'application/json' }), // ✅ Capture raw buffer for HMAC
  verifyKycWebhookSignature, // ✅ HMAC verification
  handleKycWebhookController // always returns 200
);

router
  .route('/kyc/create-session')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(createKycSessionSchema),
    checkActiveKycAttemptMiddleware,
    createKycSessionController
  );

router
  .route('/kyc/submit')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(submitKycSchema),
    checkKycAttemptExistsMiddleware,
    submitKycController
  );

router
  .route('/kyc/status')
  .get(checkAccessToken, checkAccountStatus, getKycStatusController);

export default router;
