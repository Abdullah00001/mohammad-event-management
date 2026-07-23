import { Router } from 'express';

import {
  acceptWaitListController,
  createEventController,
  getEventJournalsController,
  getEventParticipantsController,
  getEventsForAdminController,
  getEventsListingController,
  getEventSummaryController,
  getEventWaitListController,
  getMyActivityController,
  getMySingleActivityController,
  getSingleAdventureDetailsController,
  getSingleEventForAdminController,
  getEventParticipantsForAdminController,
  getSingleEventOrcaController,
  getSingleWildEventController,
  joinEventController,
  joinWaitListController,
  leaveEventController,
  removeFromWaitListController,
  removeParticipantsFromEventController,
  retrieveMyAdventureLogsController,
  submitEventJournalController,
  updateEventController,
  deleteEventController,
  getEventFeasibilityController,
} from '@/app/modules/event/event.controllers';
import {
  findEventByIdMiddleware,
  checkEventHostMiddleware,
  checkEventTypeMiddleware,
  checkParticipantOfEventMiddleware,
  checkIsEventOrcaExistMiddleware,
  checkOrcaBlockStatus,
  checkWaitListUserExistMiddleware,
  checkIsOnWaitListMiddleware,
  checkEventCapacityMiddleware,
  checkUserPenaltyMiddleware,
  checkEventCreationLocationMiddleware,
  checkEventJoinLocationMiddleware,
  checkAlreadyJoinedEventMiddleware,
  checkAlreadyOnWaitlistMiddleware,
  checkEventDeletionPolicyMiddleware,
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
    checkUserPenaltyMiddleware,
    findEventByIdMiddleware,
    checkEventJoinLocationMiddleware,
    checkAlreadyJoinedEventMiddleware,
    joinEventController
  );

router
  .route('/activity/:id/feasibility')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    getEventFeasibilityController
  );

router
  .route('/activity/:id/waitlist')
  .post(
    checkAccessToken,
    checkAccountStatus,
    checkUserPenaltyMiddleware,
    findEventByIdMiddleware,
    checkEventJoinLocationMiddleware,
    checkAlreadyOnWaitlistMiddleware,
    joinWaitListController
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
    checkUserPenaltyMiddleware,
    validateReqBody(EventCreateSchema),
    checkEventCreationLocationMiddleware,
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
  )
  .delete(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    checkEventDeletionPolicyMiddleware,
    deleteEventController
  );

router
  .route('/adventure/:id/participants')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    // checkEventHostMiddleware,
    getEventParticipantsController
  );

router
  .route('/adventure/:id/waitlist')
  .get(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    getEventWaitListController
  );

router
  .route('/adventure/:id/waitlist/:participantId')
  .post(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    checkWaitListUserExistMiddleware,
    checkIsOnWaitListMiddleware,
    checkEventCapacityMiddleware,
    acceptWaitListController
  )
  .delete(
    checkAccessToken,
    checkAccountStatus,
    findEventByIdMiddleware,
    checkEventHostMiddleware,
    checkWaitListUserExistMiddleware,
    checkIsOnWaitListMiddleware,
    removeFromWaitListController
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

router
  .route('/admin/events')
  .get(checkAdminAccessToken, getEventsForAdminController);
router
  .route('/admin/events/:id')
  .get(checkAdminAccessToken, getSingleEventForAdminController);

router
  .route('/admin/events/:id/participants')
  .get(checkAdminAccessToken, getEventParticipantsForAdminController);

export default router;
