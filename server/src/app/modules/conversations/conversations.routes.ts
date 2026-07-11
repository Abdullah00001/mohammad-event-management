import { Router } from 'express';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import {
  getConversationsController,
  getSingleConversationController,
  deleteSingleConversationController,
} from '@/app/modules/conversations/conversations.controllers';
import {
  getConversationQuerySchema,
} from '@/app/modules/conversations/conversations.schemas';
import { validateReqQuery } from '@/app/utils/system.utils';

const router = Router();

router
  .route('/conversations')
  .get(
    checkAccessToken,
    checkAccountStatus,
    validateReqQuery(getConversationQuerySchema),
    getConversationsController
  );

router
  .route('/conversations/:id')
  .get(checkAccessToken, checkAccountStatus, getSingleConversationController)
  .delete(
    checkAccessToken,
    checkAccountStatus,
    deleteSingleConversationController
  );

export default router;
