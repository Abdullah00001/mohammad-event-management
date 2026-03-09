import { Router } from 'express';

import {
  uploadSingle,
  handleMulterError,
} from '@/app/middlewares/multer.middlewares';
import { updateProfileController, uploadAvatarController } from '@/app/modules/profile/profile.controllers';
import {
  profileSetupSchema,
  profileUpdateSchema,
} from '@/app/modules/profile/profile.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/profile')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(profileSetupSchema),
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
    uploadSingle('avatar',true),
    handleMulterError,
    uploadAvatarController
  );

export default router;
