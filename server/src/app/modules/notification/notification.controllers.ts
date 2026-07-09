import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import { TNotificationQueryParams } from '@/app/modules/notification/notification.schemas';
import {
  deleteNotificationService,
  getNotificationsService,
} from '@/app/modules/notification/notification.services';
import { User } from '@prisma/client';

export const getNotificationsController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user;
    const query = req.validatedQuery as TNotificationQueryParams;
    const data = await getNotificationsService({ query, userId: user.id });
    res.status(200).json({
      success: true,
      message: 'Get notifications successful',
      data,
      traceId,
    });
    return;
  }
);

export const deleteNotificationController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    await deleteNotificationService({ user, id });
    res.status(200).json({
      success: true,
      message: 'Delete notification successful',
      data: null,
      traceId,
    });
    return;
  }
);
