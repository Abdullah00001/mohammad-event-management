import { Router } from 'express';

import {
  createEventController,
  getEventJournalsController,
  getEventsListingController,
  getEventSummaryController,
  getMyActivityController,
  getMySingleActivityController,
  getSingleAdventureDetailsController,
  getSingleEventOrcaController,
  getSingleWildEventController,
  joinEventController,
  leaveEventController,
  removeParticipantsFromEventController,
  retrieveMyAdventureLogsController,
  submitEventJournalController,
  updateEventController,
} from '@/app/modules/event/event.controllers';
import {
  findEventByIdMiddleware,
  checkEventHostMiddleware,
  checkEventTypeMiddleware,
  checkParticipantOfEventMiddleware,
  checkIsEventOrcaExistMiddleware,
  checkOrcaBlockStatus,
} from '@/app/modules/event/event.middlewares';
import {
  EventCreateSchema,
  querySchema,
  SubmitEventJournalSchema,
} from '@/app/modules/event/event.schemas';
import {
  checkAccessToken,
  checkAccountStatus,
  checkAdminAccessToken,
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
    getSingleWildEventController
  );

/**
 * ======================================================
 * ----- USER ACTIVITY & EVENT INTERACTION ROUTES -------
 * ======================================================
 */

router
  .route('/activity')
  .get(checkAccessToken, checkAccountStatus, getMyActivityController);

router
  .route('/activity/:id')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    getMySingleActivityController
  );

router
  .route('/activity/:id/join')
  .post(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    joinEventController
  );

router
  .route('/activity/:id/leave')
  .post(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    leaveEventController
  );

router
  .route('/activity/:id/journals')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    getEventJournalsController
  );

router
  .route('/activity/:id/journals')
  .post(
    checkAccessToken,
    checkAccountStatus,
    validateReqBody(SubmitEventJournalSchema),
    findEventByIdMiddleware,
    checkParticipantOfEventMiddleware,
    submitEventJournalController
  );

router
  .route('/activity/:id/summary')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    getEventSummaryController
  );

router
  .route('/activity/:id/orcas/:orcaId')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkIsEventOrcaExistMiddleware,
    checkOrcaBlockStatus,
    getSingleEventOrcaController
  );

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
    checkEventTypeMiddleware,
    createEventController
  );
router
  .route('/adventure')
  .get(checkAccessToken, checkAccountStatus, retrieveMyAdventureLogsController);

router
  .route('/adventure/:id')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    getSingleAdventureDetailsController
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

/**
 * =======================================================
 * ------ ADMIN Event Management Routes -------
 * =======================================================
 */

router.route('/admin/events').get(checkAdminAccessToken);
router.route('/admin/events/:id').get(checkAdminAccessToken);

export default router;
