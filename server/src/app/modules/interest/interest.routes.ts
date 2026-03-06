import { Router } from 'express';

import {
  handleMulterError,
  uploadSingle,
} from '@/app/middlewares/multer.middlewares';
import { createInterestController } from '@/app/modules/interest/interest.controllers';
import { interestSchema } from '@/app/modules/interest/interest.schemas';
import { checkAdminAccessToken } from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/admin/interest')
  .post(
    checkAdminAccessToken,
    uploadSingle('interestIcon'),
    handleMulterError,
    validateReqBody(interestSchema),
    createInterestController
  );

export default router;
