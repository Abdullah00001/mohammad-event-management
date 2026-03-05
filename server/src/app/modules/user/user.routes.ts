import { Router } from 'express';

import {
  loginController,
  resendSignupUserOtpController,
  signupController,
  verifySignupUserController,
} from '@/app/modules/user/user.controllers';
import {
  checkOtp,
  checkOtpPageToken,
  checkPassword,
  findUserWithEmail,
} from '@/app/modules/user/user.middlewares';
import {
  loginSchema,
  signupSchema,
  verifyOtpSchema,
} from '@/app/modules/user/user.schemas';
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

router
  .route('/auth/login')
  .post(
    validateReqBody(loginSchema),
    findUserWithEmail,
    checkPassword,
    loginController
  );

router
  .route('/auth/admin/login')
  .post(
    validateReqBody(loginSchema),
    findUserWithEmail,
    checkPassword,
    loginController
  );

export default router;
