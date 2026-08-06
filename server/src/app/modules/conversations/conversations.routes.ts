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
import { getConversationQuerySchema } from '@/app/modules/conversations/conversations.schemas';
import { validateReqQuery } from '@/app/utils/system.utils';
import { checkConversationAccessMiddleware } from '@/app/modules/conversations/conversations.middlewares';

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
  .get(
    checkAccessToken,
    checkAccountStatus,
    checkConversationAccessMiddleware,
    getSingleConversationController
  )
  .delete(
    checkAccessToken,
    checkAccountStatus,
    checkConversationAccessMiddleware,
    deleteSingleConversationController
  );

export default router;
