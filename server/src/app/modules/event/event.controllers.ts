import { User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  EventQueryParams,
  TEventCreatePayload,
} from '@/app/modules/event/event.schemas';
import {
  createEventService,
  getEventListingService,
} from '@/app/modules/event/event.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const createEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const payload = req.body as TEventCreatePayload;
    await createEventService({
      payload,
      user,
    });
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Event creation successful',
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
    await getEventListingService({ query });
    res.status(201).json({
      success: true,
      status: 200,
      message: 'Events retrieve successful',
      traceId,
    });
    return;
  }
);
