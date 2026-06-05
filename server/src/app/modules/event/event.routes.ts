import { Router } from 'express';

import {
  createEventController,
  getEventsListingController,
  getSingleEventController,
  removeParticipantsFromEventController,
  retrieveMyAdventureLogsController,
  updateEventController,
} from '@/app/modules/event/event.controllers';
import {
  findEventByIdMiddleware,
  checkEventHostMiddleware,
} from '@/app/modules/event/event.middlewares';
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
 * ---------- WILD ROUTES -----------
 * ==================================
 */

router
  .route('/wild')
  .get(
    checkAccessToken,
    checkAccountStatus,
    validateReqQuery(querySchema),
    getEventsListingController
  );

router
  .route('/wild/:id')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    getSingleEventController
  );

/**
 * ======================================================
 * ----- USER ACTIVITY & EVENT INTERACTION ROUTES -------
 * ======================================================
 */

/**
 * =======================================================
 * ------ Adventure Logs & Event Management Routes -------
 * =======================================================
 */

router
  .route('/adventure')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(EventCreateSchema),
    createEventController
  );
router
  .route('/adventure')
  .get(
    checkAccessToken,
    checkAccountStatus,
    retrieveMyAdventureLogsController
  );

router
  .route('/adventure/:id')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    getSingleEventController
  )
  .patch(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    updateEventController
  );

router
  .route('/adventure/remove/participant/:id')
  .patch(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    removeParticipantsFromEventController
  );

export default router;
