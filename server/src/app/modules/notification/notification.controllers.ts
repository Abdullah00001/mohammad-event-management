import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';

export const getNotificationsController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    res.status(200).json({
      success: true,
      message: 'Get notifications successful',
      data: null,
      traceId,
    });
    return;
  }
);
