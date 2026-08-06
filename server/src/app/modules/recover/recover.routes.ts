import { Router } from 'express';

import {
  findRecoverUserController,
  resendRecoverUserOtpController,
  resetRecoverUserPasswordController,
  verifyRecoverUserOtpController,
} from '@/app/modules/recover/recover.controllers';
import { checkAdminOtpPageToken } from '@/app/modules/recover/recover.middlewares';
import {
  resetPassword,
  verifyOtpSchema,
} from '@/app/modules/recover/recover.schemas';
import {
  checkOtp,
  checkOtpPageToken,
  findUserWithEmail,
  isAdmin,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * ==========================================
 * =============== USER FLOW ================
 * ==========================================
 */

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

/**
 * ==========================================
 * ============== ADMIN FLOW ================
 * ==========================================
 */

router
  .route('/admin/recover/find')
  .post(findUserWithEmail, isAdmin, findRecoverUserController);

router
  .route('/admin/recover/resend')
  .post(checkAdminOtpPageToken, isAdmin, resendRecoverUserOtpController);

router
  .route('/admin/recover/verify')
  .post(
    checkAdminOtpPageToken,
    isAdmin,
    validateReqBody(verifyOtpSchema),
    checkOtp,
    verifyRecoverUserOtpController
  );

router
  .route('/admin/recover/password')
  .post(
    checkAdminOtpPageToken,
    isAdmin,
    validateReqBody(resetPassword),
    resetRecoverUserPasswordController
  );

export default router;
