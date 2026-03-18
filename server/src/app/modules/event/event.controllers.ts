import { User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { TEventCreatePayload } from '@/app/modules/event/event.schemas';
import { createEventService } from '@/app/modules/event/event.services';
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
