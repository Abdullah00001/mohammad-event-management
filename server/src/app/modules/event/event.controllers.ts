import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { TEventCreatePayload } from '@/app/modules/event/event.schemas';
import { asyncHandler } from '@/app/utils/system.utils';

export const createEventController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const payload = req.body as TEventCreatePayload;
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Event creation successful',
      traceId,
    });
    return;
  }
);
