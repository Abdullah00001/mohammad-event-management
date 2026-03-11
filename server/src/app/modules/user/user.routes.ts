import { Router } from 'express';

import {
  adminRefreshTokenController,
  checkAccessTokenController,
  loginController,
  resendSignupUserOtpController,
  retrieveUserListController,
  signupController,
  verifySignupUserController,
} from '@/app/modules/user/user.controllers';
import {
  checkAccessToken,
  checkAccountStatus,
  checkAdminAccessToken,
  checkAdminRefreshToken,
  checkOtp,
  checkOtpPageToken,
  checkPassword,
  findUserWithEmail,
  isAdmin,
} from '@/app/modules/user/user.middlewares';
import {
  loginSchema,
  signupSchema,
  verifyOtpSchema,
} from '@/app/modules/user/user.schemas';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * ==============================================
 * =============== USER ENDPOINTS ===============
 * ==============================================
 */

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
  .route('/auth/check')
  .get(checkAccessToken, checkAccountStatus, checkAccessTokenController);

/**
 * ==============================================
 * ============== ADMIN ENDPOINTS ===============
 * ==============================================
 */

router
  .route('/admin/auth/login')
  .post(
    validateReqBody(loginSchema),
    findUserWithEmail,
    isAdmin,
    checkPassword,
    loginController
  );

router
  .route('/admin/auth/check')
  .get(checkAdminAccessToken, isAdmin, checkAccessTokenController);

router
  .route('/admin/auth/refresh')
  .post(checkAdminRefreshToken, isAdmin, adminRefreshTokenController);

router
  .route('/admin/users')
  .get(checkAdminAccessToken, isAdmin, retrieveUserListController);

export default router;
