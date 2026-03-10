import { Router } from 'express';

import {
  uploadSingle,
  handleMulterError,
} from '@/app/middlewares/multer.middlewares';
import {
  changePasswordController,
  changeUserPreferenceController,
  getAdminProfileInformationController,
  updateProfileController,
  uploadAvatarController,
} from '@/app/modules/profile/profile.controllers';
import { checkCurrentPassword } from '@/app/modules/profile/profile.middlewares';
import {
  profileSetupSchema,
  profileUpdateSchema,
  UserPreferenceSchema,
} from '@/app/modules/profile/profile.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
  checkAdminAccessToken,
  isAdmin,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * ==================================================
 * ================== User Routed ===================
 * ==================================================
 */

router
  .route('/profile/setup')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(profileSetupSchema),
    updateProfileController
  );

router
  .route('/profile')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(profileUpdateSchema),
    updateProfileController
  )
  .patch(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(profileUpdateSchema),
    updateProfileController
  );

router
  .route('/profile/avatar')
  .post(
    checkAccessToken,
    checkAccountStatus,
    uploadSingle('avatar', true),
    handleMulterError,
    uploadAvatarController
  );

router
  .route('/profile/password')
  .patch(
    checkAccessToken,
    checkAccountStatus,
    checkCurrentPassword,
    changePasswordController
  );

router
  .route('/profile/preference')
  .patch(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(UserPreferenceSchema),
    changeUserPreferenceController
  );

/**
 * ==================================================
 * ================= Admin Routed ===================
 * ==================================================
 */

router
  .route('/admin/profile')
  .get(checkAdminAccessToken, isAdmin, getAdminProfileInformationController);

router
  .route('/admin/profile')
  .patch(
    checkAdminAccessToken,
    isAdmin,
    checkAccountStatus,
    validateReqBody(profileUpdateSchema),
    updateProfileController
  );

router
  .route('/admin/profile/avatar')
  .post(
    checkAdminAccessToken,
    isAdmin,
    checkAccountStatus,
    uploadSingle('avatar', true),
    handleMulterError,
    uploadAvatarController
  );

router
  .route('/admin/profile/password')
  .patch(
    checkAdminAccessToken,
    isAdmin,
    checkAccountStatus,
    checkCurrentPassword,
    changePasswordController
  );

export default router;
