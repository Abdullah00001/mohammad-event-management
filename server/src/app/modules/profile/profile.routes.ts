import { Router } from 'express';

import { updateProfileController } from '@/app/modules/profile/profile.controllers';
import { profileSetupSchema } from '@/app/modules/profile/profile.schemas';
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
  );

export default router;
