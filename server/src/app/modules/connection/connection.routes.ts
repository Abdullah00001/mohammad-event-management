import { Router } from 'express';

import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import {
  blockOneConnectionController,
  getMyConnectionController,
  getMyConnectionRequestsController,
  getMySingleConnectionController,
  manageMyConnectionRequestsController,
  sendFriendRequestController,
} from '@/app/modules/connection/connection.controllers';
import {
  blockOneConnectionMiddleware,
  checkIsConnectionExistMiddleware,
  checkIsUserBlockMiddleware,
  checkReceiverExistMiddleware,
  manageMyConnectionRequestsMiddleware,
} from '@/app/modules/connection/connection.middlewares';
import { validateReqBody } from '@/app/utils/system.utils';
import {
  blockOneConnectionSchema,
  manageMyConnectionRequestSchema,
  sendFriendRequestSchema,
} from '@/app/modules/connection/connection.schemas';

const router = Router();

router
  .route('/connections')
  .get(checkAccessToken, checkAccountStatus, getMyConnectionController);

router
  .route('/connections/:id')
  .get(
    checkAccessToken,
    checkAccountStatus,
    checkIsConnectionExistMiddleware,
    checkIsUserBlockMiddleware,
    getMySingleConnectionController
  );

router
  .route('/connections/requests')
  .get(checkAccessToken, checkAccountStatus, getMyConnectionRequestsController)
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(sendFriendRequestSchema),
    checkReceiverExistMiddleware,
    sendFriendRequestController
  )
  .patch(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(manageMyConnectionRequestSchema),
    manageMyConnectionRequestsMiddleware,
    manageMyConnectionRequestsController
  );

router
  .route('/connections/block/:id')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(blockOneConnectionSchema),
    checkIsConnectionExistMiddleware,
    blockOneConnectionMiddleware,
    blockOneConnectionController
  );

export default router;
