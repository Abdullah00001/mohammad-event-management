import { Router } from 'express';

import {
  handleMulterError,
  uploadSingle,
} from '@/app/middlewares/multer.middlewares';
import { createEventTypeController } from '@/app/modules/eventType/eventType.controllers';
import { createEventTypeSchema } from '@/app/modules/eventType/eventType.schemas';
import { checkAdminAccessToken } from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * =====================================
 * -----------ADMIN ROUTES--------------
 * =====================================
 */

router
  .route('/admin/eventType')
  .post(
    checkAdminAccessToken,
    uploadSingle('thumbnail', true),
    handleMulterError,
    validateReqBody(createEventTypeSchema),
    createEventTypeController
  );

router
  .route('/admin/eventType/:id')
  .post(
    checkAdminAccessToken,
    uploadSingle('thumbnail'),
    handleMulterError,
    validateReqBody(createEventTypeSchema),
    createEventTypeController
  );

export default router;
