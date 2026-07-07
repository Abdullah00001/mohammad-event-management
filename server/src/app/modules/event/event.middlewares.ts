import { Request, Response, NextFunction } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import prisma from '@/app/configs/db.configs';
import { EventRole, User } from '@prisma/client';

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

export const checkEventTypeMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { eventTypeId } = req.body;
    if (!eventTypeId) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'eventTypeId is required',
        traceId: getTraceId(),
      });
      return;
    }
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: eventTypeId as string,
      },
    });
    if (!eventType) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Event type not found',
        traceId: getTraceId(),
      });
      return;
    }
    next();
    return;
  }
);

export const checkParticipantOfEventMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const event = req.event;
    const { participantId } = req.body as { participantId: string };
    const participant = await prisma.eventParticipants.findFirst({
      where: {
        eventId: event.id,
        participantId,
      },
    });
    if (!participant) {
      res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden: You are not a participant of this event',
        traceId: getTraceId(),
      });
      return;
    }
    next();
    return;
  }
);

export const checkIsEventOrcaExistMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { orcaId } = req.params;
    if (!orcaId) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User profile not found',
        traceId: getTraceId(),
      });
      return;
    }
    // ── 1. Check profile exists ───────────────────────────────────
    const profile = await prisma.profile.findUnique({
      where: { userId: orcaId as string },
      select: { userId: true },
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User profile not found',
        traceId: getTraceId(),
      });
      return;
    }

    // ── 2. Check user is a participant of the event ───────────────
    const event = req.event;

    const participant = await prisma.eventParticipants.findUnique({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: orcaId as string,
        },
      },
      select: { participantId: true },
    });

    if (!participant) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User is not a participant of this event',
        traceId: getTraceId(),
      });
      return;
    }

    next();
    return;
  }
);

export const checkOrcaBlockStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { orcaId } = req.params as { orcaId: string };
    const traceId = getTraceId();
    const user = req.user as User;
    if (!orcaId) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Orca id is missing',
        traceId,
      });
      return;
    }
    const block = await prisma.blockList.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedUserId: orcaId },
          { blockerId: orcaId, blockedUserId: user.id },
        ],
      },
      select: { blockerId: true },
    });
    if (block) {
      const message =
        block.blockerId === user.id
          ? 'You have blocked this user'
          : 'You have been blocked by this user';

      res.status(403).json({ success: false, status: 403, message, traceId });
      return;
    }
    next();
    return;
  }
);


// ── 1. Check user exists ──────────────────────────────────────────────────────
export const checkWaitListUserExistMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const { participantId } = req.params as { participantId: string };
 
    const user = await prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true },
    });
 
    if (!user) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found',
        traceId,
      });
      return;
    }
 
    next();
    return;
  }
);
 
// ── 2. Check user is on the waitlist ─────────────────────────────────────────
export const checkIsOnWaitListMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
    const { participantId } = req.params as { participantId: string };
 
    const waitListEntry = await prisma.waitList.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: participantId,
        },
      },
      select: { id: true },
    });
 
    if (!waitListEntry) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User is not on the waitlist for this event',
        traceId,
      });
      return;
    }
 
    next();
    return;
  }
);
 
// ── 3. Check event has enough capacity (POST only) ────────────────────────────
export const checkEventCapacityMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;
 
    const participantCount = await prisma.eventParticipants.count({
      where: {
        eventId: event.id,
        leftAt: null,
      },
    });
 
    if (participantCount >= event.maxParticipantsCount) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Event is at full capacity',
        traceId,
      });
      return;
    }
 
    next();
    return;
  }
);