import { Router } from 'express';

import { updateProfileController } from '@/app/modules/profile/profile.controllers';
import { profileSetupSchema, profileUpdateSchema } from '@/app/modules/profile/profile.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';
import {uploadSingle,handleMulterError} from "@/app/middlewares/multer.middlewares"

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
  .post(checkAccessToken, checkAccountStatus, uploadSingle('avatar'), handleMulterError);

export default router;
