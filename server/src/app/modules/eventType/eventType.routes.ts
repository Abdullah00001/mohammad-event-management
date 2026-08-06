import { Router } from 'express';

import {
  handleMulterError,
  uploadSingle,
} from '@/app/middlewares/multer.middlewares';
import {
  createEventTypeController,
  deleteEventTypeController,
  getManyEventTypesController,
  getSingleEventTypeController,
  updateEventTypeController,
} from '@/app/modules/eventType/eventType.controllers';
import { findEventTypeById } from '@/app/modules/eventType/eventType.middlewares';
import { createEventTypeSchema } from '@/app/modules/eventType/eventType.schemas';
import {
  checkAccessToken,
  checkAdminAccessToken,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();
/**
 * =====================================
 * ----------- USER ROUTES -------------
 * =====================================
 */

router.route('/eventType').get(checkAccessToken, getManyEventTypesController);

/**
 * =====================================
 * ---------- ADMIN ROUTES -------------
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
  )
  .get(checkAdminAccessToken, getManyEventTypesController);

router
  .route('/admin/eventType/:id')
  .get(checkAdminAccessToken, findEventTypeById, getSingleEventTypeController)
  .post(
    checkAdminAccessToken,
    findEventTypeById,
    uploadSingle('thumbnail'),
    handleMulterError,
    validateReqBody(createEventTypeSchema),
    updateEventTypeController
  )
  .delete(checkAdminAccessToken, findEventTypeById, deleteEventTypeController);

export default router;
