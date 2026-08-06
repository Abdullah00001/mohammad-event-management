import { Request, Response, NextFunction } from 'express';
import { getTraceId } from '@/app/configs/requestContext.configs';
import prisma from '@/app/configs/db.configs';
import { asyncHandler } from '@/app/utils/system.utils';

export const checkIsNotificationExists = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const notificationId = req.params.id as string;

    // Check if the notification exists in the database
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found or has been deleted',
        traceId,
      });
      return;
    }

    // If the notification exists, proceed to the next middleware/controller
    next();
  }
);
