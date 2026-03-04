import { Router } from 'express';

import {
  resendSignupUserOtpController,
  signupController,
  verifySignupUserController,
} from '@/app/modules/user/user.controllers';
import {
  checkOtp,
  checkOtpPageToken,
  findUserWithEmail,
} from '@/app/modules/user/user.middlewares';
import { signupSchema, verifyOtpSchema } from '@/app/modules/user/user.schemas';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/auth/signup')
  .post(validateReqBody(signupSchema), findUserWithEmail, signupController);

router
  .route('/auth/verify')
  .post(
    validateReqBody(verifyOtpSchema),
    checkOtpPageToken,
    checkOtp,
    verifySignupUserController
  );

router
  .route('/auth/resend')
  .post(checkOtpPageToken, resendSignupUserOtpController);

export default router;
