import { Router } from 'express';

import {
  handleMulterError,
  uploadSingle,
} from '@/app/middlewares/multer.middlewares';
import {
  createInterestController,
  deleteOneInterestController,
  getInterestController,
  searchInterestController,
  updateInterestController,
} from '@/app/modules/interest/interest.controllers';
import { findInterestById } from '@/app/modules/interest/interest.middlewares';
import { interestSchema } from '@/app/modules/interest/interest.schemas';
import {
  checkAccessToken,
  checkAdminAccessToken,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';

const router = Router();

/**
 * =================================================
 * ================== USER ROUTES ==================
 * =================================================
 */

router.route('/interest').get(checkAccessToken, getInterestController);

router
  .route('/interest/search')
  .get(checkAdminAccessToken, searchInterestController);

/**
 * =================================================
 * ================= ADMIN ROUTES ==================
 * =================================================
 */

router
  .route('/admin/interest')
  .post(
    checkAdminAccessToken,
    uploadSingle('interestIcon'),
    handleMulterError,
    validateReqBody(interestSchema),
    createInterestController
  )
  .get(checkAdminAccessToken, getInterestController);

router
  .route('/admin/interest/:id')
  .put(
    checkAdminAccessToken,
    findInterestById,
    uploadSingle('interestIcon'),
    handleMulterError,
    validateReqBody(interestSchema),
    updateInterestController
  )
  .delete(checkAdminAccessToken, findInterestById, deleteOneInterestController);

router
  .route('/admin/interest/search')
  .get(checkAdminAccessToken, searchInterestController);

export default router;
