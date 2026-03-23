import { Router } from 'express';

import {
  createEventController,
  getEventsListingController,
} from '@/app/modules/event/event.controllers';
import {
  EventCreateSchema,
  querySchema,
} from '@/app/modules/event/event.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
} from '@/app/modules/user/user.middlewares';
import { validateReqBody, validateReqQuery } from '@/app/utils/system.utils';

const router = Router();

/**
 * ==================================
 * ---------- USER ROUTES -----------
 * ==================================
 */

router
  .route('/events')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(EventCreateSchema),
    createEventController
  )
  .get(
    checkAccessToken,
    checkAccountStatus,
    validateReqQuery(querySchema),
    getEventsListingController
  );

export default router;
