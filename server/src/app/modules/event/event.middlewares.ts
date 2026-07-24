import { Request, Response, NextFunction } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler, getCountryFromCoords } from '@/app/utils/system.utils';
import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { EventRole, User, EventStatus } from '@prisma/client';
import { userHasFeatureService } from '@/app/modules/subscription/subscription.services';
import { TEventCreatePayload } from '@/app/modules/event/event.schemas';

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

// ── Penalty enforcement — prevent banned users from creating/joining ──────────
export const checkUserPenaltyMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;

    if (user.penaltyEndDate && new Date() < new Date(user.penaltyEndDate)) {
      res.status(403).json({
        success: false,
        status: 403,
        message: `Your account is temporarily restricted due to repeated no-shows or late cancellations. The restriction will be lifted on ${new Date(user.penaltyEndDate).toISOString()}.`,
        data: {
          penaltyEndDate: user.penaltyEndDate,
          strikeCount: user.strikeCount,
        },
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

// ── Location-based creation guard ─────────────────────────────────────────────
export const checkEventCreationLocationMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { lat, lng } = req.body as { lat: number; lng: number };

    const hasTravelMode = await userHasFeatureService(user.id, 'TRAVEL_MODE');

    if (!hasTravelMode) {
      const redisClient = getRedisClient();
      const cachedLocation = await redisClient.get(`user:location:${user.id}`);

      if (!cachedLocation) {
        res.status(403).json({
          success: false,
          status: 403,
          message:
            'Unable to verify your location. Please enable location services.',
          traceId,
        });
        return;
      }

      const parsed = JSON.parse(cachedLocation) as { lat: number; lng: number };
      const [userCountry, eventCountry] = await Promise.all([
        getCountryFromCoords(parsed.lat, parsed.lng),
        getCountryFromCoords(lat, lng),
      ]);

      if (userCountry && eventCountry && userCountry !== eventCountry) {
        res.status(403).json({
          success: false,
          status: 403,
          message:
            'Free users can only create events in their current country. Upgrade to Premium for international event creation.',
          traceId,
        });
        return;
      }
    }

    next();
    return;
  }
);

export const checkEventJoinLocationMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const event = req.event;

    const hasTravelMode = await userHasFeatureService(user.id, 'TRAVEL_MODE');

    if (!hasTravelMode) {
      const redisClient = getRedisClient();
      const cachedLocation = await redisClient.get(`user:location:${user.id}`);

      if (!cachedLocation) {
        res.status(403).json({
          success: false,
          status: 403,
          message:
            'Unable to verify your location. Please enable location services.',
          traceId,
        });
        return;
      }

      const parsed = JSON.parse(cachedLocation) as { lat: number; lng: number };
      const [userCountry, eventCountry] = await Promise.all([
        getCountryFromCoords(parsed.lat, parsed.lng),
        getCountryFromCoords(event.lat, event.lng),
      ]);

      if (userCountry && eventCountry && userCountry !== eventCountry) {
        res.status(403).json({
          success: false,
          status: 403,
          message:
            'Free users can only join events in their current country. Upgrade to Premium for international event access.',
          traceId,
        });
        return;
      }
    }

    next();
    return;
  }
);

export const checkAlreadyJoinedEventMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as User;
    const event = req.event;
    const traceId = getTraceId();

    const existingParticipant = await prisma.eventParticipants.findFirst({
      where: {
        eventId: event.id,
        participantId: user.id,
        leftAt: null,
      },
    });

    if (existingParticipant) {
      res.status(409).json({
        success: false,
        status: 409,
        message: 'You have already joined this event.',
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

export const checkAlreadyOnWaitlistMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as User;
    const event = req.event;
    const traceId = getTraceId();

    const existingWaitlist = await prisma.waitList.findFirst({
      where: {
        eventId: event.id,
        userId: user.id,
      },
    });

    if (existingWaitlist) {
      res.status(409).json({
        success: false,
        status: 409,
        message: 'You are already on the waitlist for this event.',
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

export const checkEventDeletionPolicyMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const event = req.event;

    if (event.eventStatus !== EventStatus.UPCOMING) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Only upcoming events can be deleted',
        traceId,
      });
      return;
    }

    const participantCount = await prisma.eventParticipants.count({
      where: {
        eventId: event.id,
        role: { not: EventRole.HOST },
        leftAt: null,
      },
    });

    if (participantCount > 0) {
      const now = new Date();
      const hoursUntilStart =
        (event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilStart >= 0 && hoursUntilStart < 6) {
        res.status(403).json({
          success: false,
          status: 403,
          message: 'You cannot delete this event within 6 hours of the start time because it has participants. Please inform them via the group chat.',
          traceId,
        });
        return;
      }
    }

    next();
    return;
  }
);

export const checkPrivatePodMiddleware=asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
  const {isPrivate}=req.body as TEventCreatePayload;
  next();
  return
});