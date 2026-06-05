import { Request, Response, NextFunction } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import prisma from '@/app/configs/db.configs';
import { EventRole } from '@prisma/client';

export const findEventByIdMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Event id is required',
        traceId: getTraceId(),
      });
      return;
    }
    const event = await prisma.event.findUnique({
      where: {
        id: id as string,
      },
    });
    if (!event) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Event not found',
        traceId: getTraceId(),
      });
      return;
    }
    req.event = event;
    next();
    return;
  }
);

export const checkEventHostMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    const event = req.event;
    const host = await prisma.eventParticipants.findFirst({
      where: {
        eventId: event.id,
        role: EventRole.HOST,
        participantId: user?.id,
      },
    });
    if (!host) {
      res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden: You are not the host of this event',
        traceId: getTraceId(),
      });
      return;
    }
    next();
    return;
  }
);
