import { Router } from 'express';

import {
  adminRefreshTokenController,
  changeUserAccountStatusController,
  checkAccessTokenController,
  checkAdminAccessTokenController,
  loginController,
  resendSignupUserOtpController,
  retrieveSingleUserController,
  retrieveUserListController,
  signupController,
  verifySignupUserController,
  socialLoginController,
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
  checkDeviceFcmAccessToken,
} from '@/app/modules/user/user.middlewares';
import {
  loginSchema,
  signupSchema,
  verifyOtpSchema,
  checkAccessTokenSchema,
  adminLoginSchema,
  changeUserAccountStatusSchema,
  socialLoginSchema,
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
  .post(findUserWithEmail, validateReqBody(signupSchema), signupController);

router
  .route('/auth/verify')
  .post(
    checkOtpPageToken,
    validateReqBody(verifyOtpSchema),
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
    checkDeviceFcmAccessToken,
    checkPassword,
    loginController
  );

router
  .route('/auth/social')
  .post(
    validateReqBody(socialLoginSchema),
    socialLoginController
  );

router
  .route('/auth/check')
  .post(
    checkAccessToken,
    checkAccountStatus,
    checkDeviceFcmAccessToken,
    validateReqBody(checkAccessTokenSchema),
    checkAccessTokenController
  );
/**
 * ==============================================
 * ============== ADMIN ENDPOINTS ===============
 * ==============================================
 */

router
  .route('/admin/auth/login')
  .post(
    validateReqBody(adminLoginSchema),
    findUserWithEmail,
    isAdmin,
    checkPassword,
    loginController
  );

router
  .route('/admin/auth/check')
  .get(checkAdminAccessToken, isAdmin, checkAdminAccessTokenController);

router
  .route('/admin/auth/refresh')
  .post(checkAdminRefreshToken, isAdmin, adminRefreshTokenController);

router
  .route('/admin/users')
  .get(checkAdminAccessToken, isAdmin, retrieveUserListController);

router
  .route('/admin/users/:id')
  .get(checkAdminAccessToken, isAdmin, retrieveSingleUserController)
  .patch(checkAdminAccessToken, isAdmin,validateReqBody(changeUserAccountStatusSchema) ,changeUserAccountStatusController);

export default router;
