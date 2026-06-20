import { EventStatus, User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  EventQueryParams,
  TEventCreatePayload,
  TUpdateEventInformationPayload,
} from '@/app/modules/event/event.schemas';
import {
  createEventService,
  getEventListingService,
  getMyActivityService,
  getMySingleEventService,
  getSingleAdventureDetailsService,
  getSingleWildEventService,
  joinEventService,
  leaveEventService,
  removeParticipantsFromEventService,
  retrieveMyAdventureLogsService,
  updateEventService,
  getEventJournalService,
  submitEventJournalService,
  getEventSummaryService,
  getSingleEventOrcaService,
  getEventsForAdminService,
  getEventParticipantsService,
  getEventWaitListService,
  joinWaitListService,
} from '@/app/modules/event/event.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const createEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const payload = req.body as TEventCreatePayload;
    const { eventId } = await createEventService({
      payload,
      user,
    });
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Event creation successful',
      data: { eventId },
      traceId,
    });
    return;
  }
);

export const getEventsListingController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const query = req.validatedQuery as EventQueryParams;
    const response = await getEventListingService({ query, user });
    res.status(201).json({
      success: true,
      status: 200,
      message: 'Events retrieve successful',
      ...response,
      traceId,
    });
    return;
  }
);

export const getSingleWildEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const user = req.user as User;
    const data = await getSingleWildEventService({ event, user });
    if (!data) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Event not found',
        traceId,
      });
      return;
    }
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const getSingleAdventureDetailsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;
    const data = await getSingleAdventureDetailsService({
      event,
      user,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event retrieve successful',
      data,
      traceId,
    });
    return;
  }
);

export const getEventParticipantsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;
    const { page, limit } = req.query as {
      page?: number;
      limit?: number;
    };
    const data = await getEventParticipantsService({
      event,
      user,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event participants retrieve successful',
      ...(data as { data: unknown; meta: unknown }),
      traceId,
    });
    return;
  }
);

export const getEventWaitListController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const { page, limit } = req.query as {
      page?: number;
      limit?: number;
    };
    const data = await getEventWaitListService({
      event,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event waitlist retrieve successful',
      ...(data as { data: unknown; meta: unknown }),
      traceId,
    });
    return;
  }
);

export const updateEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const payload = req.body as Partial<TUpdateEventInformationPayload>;
    const data = await updateEventService({ event, payload });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event update successful',
      data,
      traceId,
    });
    return;
  }
);

export const removeParticipantsFromEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const { participantId } = req.body as { participantId: string };
    await removeParticipantsFromEventService({ event, participantId });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Participants removed from event successfully',
      traceId,
    });
    return;
  }
);

export const retrieveMyAdventureLogsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { eventStatus, page, limit } = req.query as {
      eventStatus: EventStatus;
      page: string | undefined;
      limit: string | undefined;
    };
    const data = await retrieveMyAdventureLogsService({
      user,
      eventStatus,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Adventure logs retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getMyActivityController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { eventStatus, page, limit } = req.query as {
      eventStatus: EventStatus;
      page: number | undefined;
      limit: number | undefined;
    };
    const data = await getMyActivityService({
      user,
      eventStatus,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'User activity retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getMySingleActivityController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;
    const data = await getMySingleEventService({ event, user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'User single activity retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const joinEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;
    await joinEventService({ event, user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'User joined event successfully',
      traceId,
    });
    return;
  }
);

export const joinWaitListController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;
    const response = await joinWaitListService({ event, user });
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Joined waitlist successful',
      data: response,
      traceId,
    });
    return;
  }
);

export const leaveEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;
    await leaveEventService({ event, user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'User left event successfully',
      traceId,
    });
    return;
  }
);

export const getEventJournalsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { limit, page } = req.query as {
      page: number | undefined;
      limit: number | undefined;
    };
    const user = req.user as User;
    const event = req.event;
    const data = await getEventJournalService({
      event,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      user,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event journals retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const submitEventJournalController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const user = req.user as User;
    const { participantId, rating } = req.body as {
      participantId: string;
      rating: number;
    };
    await submitEventJournalService({ event, participantId, rating, user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event journal submitted successfully',
      traceId,
    });
    return;
  }
);

export const getEventSummaryController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const user = req.user as User;
    const { limit, page } = req.query as {
      page: number | undefined;
      limit: number | undefined;
    };
    const data = await getEventSummaryService({
      event,
      user,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event summary retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getSingleEventOrcaController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { orcaId } = req.params as { orcaId: string };
    const event = req.event;
    const user = req.user as User;
    const data = await getSingleEventOrcaService({ event, orcaId, user });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event summary retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getEventsForAdminController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { limit, page, search } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
    };
    const data = await getEventsForAdminService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event retrieved successfully',
      data,
      traceId,
    });
    return;
  }
);

export const getSingleEventForAdminController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Event retrieved successfully',
      data: {},
      traceId,
    });
    return;
  }
);
