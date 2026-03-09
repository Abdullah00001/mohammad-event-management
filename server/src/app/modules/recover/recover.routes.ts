import { Router } from 'express';

import {
  findRecoverUserController,
  resendRecoverUserOtpController,
  resetRecoverUserPasswordController,
  verifyRecoverUserOtpController,
} from '@/app/modules/recover/recover.controllers';
import {
  resetPassword,
  verifyOtpSchema,
} from '@/app/modules/recover/recover.schemas';
import {
  checkOtp,
  checkOtpPageToken,
  findUserWithEmail,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/recover/find')
  .post(findUserWithEmail, findRecoverUserController);

router
  .route('/recover/resend')
  .post(checkOtpPageToken, resendRecoverUserOtpController);

router
  .route('/recover/verify')
  .post(
    checkOtpPageToken,
    validateReqBody(verifyOtpSchema),
    checkOtp,
    verifyRecoverUserOtpController
  );

router
  .route('/recover/password')
  .post(
    checkOtpPageToken,
    validateReqBody(resetPassword),
    resetRecoverUserPasswordController
  );

export default router;
