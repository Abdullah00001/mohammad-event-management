import { Router } from 'express';

import {
  handleAttachmentMulterError,
  uploadAttachmentArray,
} from '@/app/middlewares/multer.middlewares';
import {
  deleteAttachmentController,
  uploadAttachmentController,
} from '@/app/modules/attachment/attachment.controllers';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';
import { deleteAttachmentSchema } from '@/app/modules/attachment/attachment.schemas';

const router = Router();

// Upload an attachment
router.post(
  '/attachment',
  checkAccessToken,
  checkAccountStatus,
  uploadAttachmentArray('files', 10, true),
  handleAttachmentMulterError,
  uploadAttachmentController
);

// Delete an attachment
router.delete(
  '/attachment',
  checkAccessToken,
  checkAccountStatus,
  validateReqBody(deleteAttachmentSchema),
  deleteAttachmentController
);

export default router;