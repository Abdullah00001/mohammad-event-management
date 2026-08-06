import { Router } from 'express';

import { createNewTraitsController } from '@/app/modules/survey/survey.controllers';
import { profileTraitsSchema } from '@/app/modules/survey/survey.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/traits')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(profileTraitsSchema),
    createNewTraitsController
  );

export default router;
