import {
  EventRole,
  EventStatus,
  User,
  Event,
  Prisma,
  FriendshipStatus,
  ConversationType,
  StrikeReason,
} from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import {
  EventQueryParams,
  TEventCreatePayload,
  TUpdateEventInformationPayload,
} from '@/app/modules/event/event.schemas';
import { getCountryFromCoords } from '@/app/utils/system.utils';
import { DEFAULT_LIMIT, DEFAULT_PAGE, DEFAULT_RADIUS_KM } from '@/const';
import { getRedisClient } from '@/app/configs/redis.config';
import {
  EventItem,
  EventListingResult,
  IFeasibilityResult,
  IFeasibilityWarning,
} from '@/app/modules/event/event.types';
import {
  buildDistanceMap,
  buildEmptyResult,
  buildHaversineFragment,
  getBlockedUserIds,
} from '@/app/modules/event/event.helper';

export const createEventService = async ({
  payload,
  user,
}: {
  user: User;
  payload: TEventCreatePayload;
}): Promise<{ eventId: string; conversationId: string }> => {
  try {
    const {
      description,
      eventName,
      eventTypeId,
      lat,
      lng,
      maxParticipantsCount,
      startDate,
      endDate,
      isPrivate,
    } = payload;

    const event = await prisma.$transaction(async (tx) => {
      // ── 1. Create the event ───────────────────────────────────────
      const event = await tx.event.create({
        data: {
          description,
          eventName,
          lat,
          lng,
          maxParticipantsCount,
          startDate,
          endDate,
          isPrivate,
        },
      });

      // ── 2. Assign event type ──────────────────────────────────────
      await tx.eventEventType.create({
        data: {
          eventTypeId,
          eventId: event.id,
        },
      });

      // ── 3. Add host as participant ────────────────────────────────
      await tx.eventParticipants.create({
        data: {
          role: EventRole.HOST,
          eventId: event.id,
          participantId: user.id,
        },
      });

      // ── 4. ADDED: Create GROUP conversation linked to the event ───
      const conversation = await tx.conversation.create({
        data: {
          type: ConversationType.GROUP,
          eventId: event.id,
        },
      });

      // ── 5. ADDED: Add host as first ConversationParticipant ───────
      await tx.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId: user.id,
        },
      });

      return { event, conversationId: conversation.id };
    });

    // ── 6. ADDED: Notify nearby users ─────────────────────────────
    const systemQueue = require('@/app/queues/queues').getSystemQueue();
    systemQueue
      .add('notify-nearby-users', {
        eventId: event.event.id,
        eventName: event.event.eventName,
        lat,
        lng,
        hostId: user.id,
      })
      .catch((err: any) => {
        require('@/app/configs/logger.configs').default.error(
          'Failed to enqueue notify-nearby-users job',
          err
        );
      });

    return { eventId: event.event.id, conversationId: event.conversationId };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in create event service');
  }
};

export const getEventListingService = async ({
  query,
  user,
}: {
  query: EventQueryParams;
  user: User;
}): Promise<EventListingResult> => {
  try {
    const {
      startDate,
      distance,
      eventType,
      lng: queryLng,
      lat: queryLat,
      limit = DEFAULT_LIMIT,
      maxOrcas,
      page = DEFAULT_PAGE,
      search,
    } = query;

    // ── 1. Resolve the reference coordinates ──────────────────────
    //
    // Priority:
    //   a) Query params (lat + lng) — user explicitly scoped the search
    //   b) Cached live location   — fallback for Case 1
    //
    let refLat: number;
    let refLng: number;

    const hasExplicitCoords = queryLat !== undefined && queryLng !== undefined;

    if (hasExplicitCoords) {
      refLat = queryLat;
      refLng = queryLng;
    } else {
      const redisClient = getRedisClient();
      const cached = await redisClient.get(`user:location:${user.id}`);
      if (!cached) throw new Error('User location not found in cache');
      const parsed = JSON.parse(cached) as { lat: number; lng: number };
      refLat = parsed.lat;
      refLng = parsed.lng;
    }

    // ── 2. Determine whether this is a "bare" request (Case 1) ────
    //
    // A bare request has NO optional filter params. In that case we
    // apply a 5 km radius and country-scoping automatically.
    //
    const hasFilters = Boolean(
      startDate ||
      distance !== undefined ||
      eventType ||
      maxOrcas !== undefined ||
      search
    );

    const radiusKm: number =
      distance !== undefined ? distance : DEFAULT_RADIUS_KM;

    // ── 3. Resolve the user's country (Case 1 only) ───────────────
    let userCountry: string | null = null;
    if (!hasFilters) {
      userCountry = await getCountryFromCoords(refLat, refLng);
    }

    // ── 4. Collect blocked user IDs ───────────────────────────────
    const blockedIds = await getBlockedUserIds(user.id);

    // ── 5. Build offset ───────────────────────────────────────────
    const offset = (page - 1) * limit;

    // ── 6. Fetch nearby event IDs via raw Haversine SQL ───────────
    //
    // Prisma does not support computed/geo columns natively so we use
    // a raw query for the distance filter and hand the IDs back to the
    // ORM for the rest of the filtering.
    //
    const haversinePredicate = buildHaversineFragment(refLat, refLng, radiusKm);
    const distanceRows = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT e.id::text
        FROM "Event" e
        WHERE ${haversinePredicate}
          AND e."eventStatus"::text IN ('UPCOMING', 'ONGOING')
      `
    );

    const nearbyEventIds = distanceRows.map((r) => r.id);

    if (nearbyEventIds.length === 0) {
      return buildEmptyResult(page, limit);
    }

    // ── 7. ORM-level filters ──────────────────────────────────────

    // startDate filter — frontend sends a combined ISO UTC datetime string
    // (date + time picker merged). We use it as gte so events starting
    // at or after that exact moment are returned.
    let startDateFilter: { gte: Date } | undefined;
    if (startDate) {
      startDateFilter = { gte: new Date(startDate) };
    }

    // EventType filter — resolve matching event IDs from junction table
    let eventTypeEventIds: string[] | undefined;
    if (eventType) {
      const typeRows = await prisma.eventEventType.findMany({
        where: {
          eventTypeId: eventType,
          eventId: { in: nearbyEventIds },
        },
        select: { eventId: true },
      });
      eventTypeEventIds = typeRows.map((r) => r.eventId);
    }

    // Intersect all filter ID sets
    let filteredIds = nearbyEventIds;
    if (eventTypeEventIds)
      filteredIds = filteredIds.filter((id) => eventTypeEventIds!.includes(id));

    if (filteredIds.length === 0) {
      return buildEmptyResult(page, limit);
    }

    // ── 8. Fetch events with full relations ───────────────────────
    //
    // Rules applied in sharedWhere:
    //   1. `isPrivate: false`          — only public events
    //   2. startDate gte filter        — events at or after selected datetime
    //   3. search on eventName         — case-insensitive contains
    //   4. AND[0] — exclude blocked hosts
    //   5. AND[1] — exclude events user has ACTIVE presence in
    //               FIXED: leftAt: null — events user left reappear in wild
    //
    const sharedWhere = {
      id: { in: filteredIds },
      eventStatus: { in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
      isPrivate: false,

      ...(startDateFilter && { startDate: startDateFilter }),

      ...(search && {
        eventName: { contains: search, mode: 'insensitive' as const },
      }),

      AND: [
        // Exclude events hosted by blocked users
        {
          eventParticipants: {
            none: {
              role: EventRole.HOST,
              participantId: {
                in: blockedIds.length ? blockedIds : ['__none__'],
              },
            },
          },
        },
        // FIXED: exclude only ACTIVE presence — leftAt: null
        // once a user leaves an event, leftAt is set and event
        // reappears in the wild feed as joinable again
        {
          eventParticipants: {
            none: {
              participantId: user.id,
              leftAt: null,
            },
          },
        },
        // ADDED: exclude events where the user is on the waitlist
        {
          waitLists: {
            none: {
              userId: user.id,
            },
          },
        },
      ],
    };

    const [rawEvents, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        where: sharedWhere,
        include: {
          eventParticipants: {
            select: {
              participantId: true,
              role: true,
              user: {
                select: {
                  id: true,
                  profile: { select: { name: true, avatar: true } },
                },
              },
            },
          },
          eventTypes: {
            include: {
              eventType: {
                select: { id: true, title: true, thumbnail: true },
              },
            },
          },
          waitLists: {
            where: { userId: user.id },
            select: { id: true },
          },
        },
        orderBy: { startDate: 'asc' },
        skip: offset,
        take: limit,
      }),

      prisma.event.count({
        where: sharedWhere,
      }),
    ]);

    // ── 9. Post-fetch processing ───────────────────────────────────
    const distanceMap = await buildDistanceMap(filteredIds, refLat, refLng);

    let events: EventItem[] = rawEvents.map((event) => {
      const participants = event.eventParticipants;
      const participantCount = participants.length;
      const spotsLeft = Math.max(
        0,
        event?.maxParticipantsCount - participantCount
      );
      const isJoined = participants.some((p) => p.participantId === user.id);
      const isOnWaitList = event.waitLists.length > 0;

      return {
        id: event.id,
        eventName: event.eventName,
        startDate: event.startDate,
        maxParticipantsCount: event.maxParticipantsCount,
        eventStatus: event.eventStatus,
        lat: event.lat,
        lng: event.lng,
        isPrivate: event.isPrivate,
        distanceKm: distanceMap[event.id] ?? 0,
        participantCount,
        spotsLeft,
        isJoined,
        isOnWaitList,
        eventType: event.eventTypes[0]?.eventType ?? null,
        createdAt: event.createdAt,
      };
    });

    // Apply maxOrcas post-fetch filter
    if (maxOrcas !== undefined) {
      events = events.filter((e) => e.participantCount <= maxOrcas);
    }

    // ── 10. Country scoping (Case 1 only) ─────────────────────────
    if (!hasFilters && userCountry) {
      const countryChecks = await Promise.all(
        events.map(async (e) => {
          const country = await getCountryFromCoords(e.lat, e.lng);
          return { id: e.id, sameCountry: country === userCountry };
        })
      );
      const sameCountryIds = new Set(
        countryChecks.filter((c) => c.sameCountry).map((c) => c.id)
      );
      events = events.filter((e) => sameCountryIds.has(e.id));
    }

    // ── 11. Paginate & respond ────────────────────────────────────
    const total = events.length > 0 ? totalCount : 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: events,
      meta: {
        totalEvents: total,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get events service');
  }
};

export const getSingleWildEventService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<unknown> => {
  try {
    // ── 1. Collect blocked user IDs ───────────────────────────────
    const blockedIds = await getBlockedUserIds(user.id);

    // ── 2. Fetch and enrich the event ─────────────────────────────
    const enrichedEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        // ── JOIN 1: EventParticipants ──────────────────────────────
        eventParticipants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isPremium: true,
                isProfileSetup: true,
                profile: {
                  select: {
                    name: true,
                    avatar: true,
                    gender: true,
                    age: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },

        // ── JOIN 2: WaitList ───────────────────────────────────────
        waitLists: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isPremium: true,
                isProfileSetup: true,
                profile: {
                  select: {
                    name: true,
                    avatar: true,
                    gender: true,
                    age: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        // Join Event Type for richer details in the wild feed
        eventTypes: {
          include: {
            eventType: true,
          },
        },
      },
    });

    // ── 3. Wild rules validation ───────────────────────────────────

    const host =
      enrichedEvent.eventParticipants.find((p) => p.role === EventRole.HOST) ??
      null;

    // Rule 1: Only public, upcoming or ongoing events are visible in the wild
    if (
      enrichedEvent.isPrivate ||
      (enrichedEvent.eventStatus !== EventStatus.UPCOMING &&
        enrichedEvent.eventStatus !== EventStatus.ONGOING)
    ) {
      return null;
    }

    // Rule 2: Logged-in user must not be the host
    if (host?.participantId === user.id) {
      return null;
    }

    // CHANGED — checks any presence regardless of role
    const userHasPresence = enrichedEvent.eventParticipants.some(
      (p) => p.participantId === user.id
    );
    if (userHasPresence) {
      return null;
    }
    // Rule 3: Host must not be in the logged-in user's blocked list
    if (host && blockedIds.includes(host.participantId)) {
      return null;
    }

    // ── 4. Derive computed fields ──────────────────────────────────
    const participantCount = enrichedEvent.eventParticipants.length;
    const availableSlots = Math.max(
      0,
      enrichedEvent.maxParticipantsCount - participantCount
    );

    // ── 5. Caller's own participation status ──────────────────────
    const currentUserParticipant =
      enrichedEvent.eventParticipants.find(
        (p) => p.participantId === user.id
      ) ?? null;

    const currentUserOnWaitList =
      enrichedEvent.waitLists.find((w) => w.userId === user.id) ?? null;

    // ── 6. Return enriched event ──────────────────────────────────
    return {
      id: enrichedEvent.id,
      eventName: enrichedEvent.eventName,
      startDate: enrichedEvent.startDate,
      endDate: enrichedEvent.endDate,
      maxParticipantsCount: enrichedEvent.maxParticipantsCount,
      eventStatus: enrichedEvent.eventStatus,
      lat: enrichedEvent.lat,
      lng: enrichedEvent.lng,
      createdAt: enrichedEvent.createdAt,
      updatedAt: enrichedEvent.updatedAt,
      eventType: enrichedEvent.eventTypes[0].eventType,

      // JOIN 1
      participantCount,
      availableSlots,
      host: {
        hostId: host?.participantId,
        hostName: host?.user?.profile?.name ?? 'Unknown',
        hostAvatar: host?.user?.profile?.avatar ?? null,
      },
      // Caller context — useful for the client to render join/leave/waitlist UI
      currentUser: {
        isParticipant: !!currentUserParticipant,
        role: currentUserParticipant?.role ?? null,
        isOnWaitList: !!currentUserOnWaitList,
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get single wild event service');
  }
};
export const getSingleAdventureDetailsService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<unknown> => {
  try {
    // ── 1. Fetch event core fields ────────────────────────────────
    const enrichedEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      select: {
        id: true,
        eventName: true,
        description: true,
        startDate: true,
        endDate: true,
        maxParticipantsCount: true,
        eventStatus: true,
        lat: true,
        lng: true,

        // EventType badge
        eventTypes: {
          select: {
            eventType: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },

        // Count only — for "3/6 orcas" badge
        _count: {
          select: { eventParticipants: { where: { leftAt: null } } },
        },

        // ADDED: conversation linked to this event
        conversation: {
          select: { id: true },
        },
      },
    });

    // ── 2. Fetch host separately ────────────────────────────────────
    const hostParticipant = await prisma.eventParticipants.findFirst({
      where: { eventId: event.id, role: EventRole.HOST },
      select: {
        user: {
          select: {
            id: true,
            profile: { select: { name: true, avatar: true } },
          },
        },
      },
    });

    // ── 3. Caller's own participation status ────────────────────────
    const currentUserParticipant = await prisma.eventParticipants.findUnique({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: user.id,
        },
      },
      select: { role: true },
    });

    const currentUserOnWaitList = await prisma.waitList.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    // ── 4. Derive computed fields ───────────────────────────────────
    const participantCount = enrichedEvent._count.eventParticipants;
    const availableSlots = Math.max(
      0,
      enrichedEvent.maxParticipantsCount - participantCount
    );

    // ── 5. Return clean event detail ────────────────────────────────
    return {
      id: enrichedEvent.id,
      eventName: enrichedEvent.eventName,
      description: enrichedEvent.description,
      startDate: enrichedEvent.startDate,
      endDate: enrichedEvent.endDate,
      eventStatus: enrichedEvent.eventStatus,
      lat: enrichedEvent.lat,
      lng: enrichedEvent.lng,

      eventType: enrichedEvent.eventTypes[0]?.eventType ?? null,

      // ADDED: conversationId for the pod chat
      conversationId: enrichedEvent.conversation?.id ?? null,

      maxParticipantsCount: enrichedEvent.maxParticipantsCount,
      participantCount,
      availableSlots,

      host: hostParticipant
        ? {
            id: hostParticipant.user.id,
            name: hostParticipant.user.profile?.name ?? null,
            avatar: hostParticipant.user.profile?.avatar ?? null,
          }
        : null,

      currentUser: {
        isParticipant: !!currentUserParticipant,
        role: currentUserParticipant?.role ?? null,
        isOnWaitList: !!currentUserOnWaitList,
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get single event service');
  }
};

export const getEventParticipantsService = async ({
  event,
  user,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}: {
  event: Event;
  user: User;
  page?: number;
  limit?: number;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── 1. Fetch paginated participants + total count ──────────────
    const [rawParticipants, totalCount] = await prisma.$transaction([
      prisma.eventParticipants.findMany({
        where: {
          eventId: event.id,
          leftAt: null,
        },
        select: {
          role: true,
          joinedAt: true,
          participantId: true,
          user: {
            select: {
              id: true,
              isPremium: true,
              profile: {
                select: {
                  name: true,
                  avatar: true,
                  gender: true,
                  age: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip: offset,
        take: limit,
      }),

      prisma.eventParticipants.count({
        where: {
          eventId: event.id,
          leftAt: null,
        },
      }),
    ]);

    // ── 2. Collect participant IDs (excluding calling user) ────────
    const participantIds = rawParticipants
      .filter((p) => p.participantId !== user.id)
      .map((p) => p.participantId);

    // ── 3. Fetch block relationships in bulk ──────────────────────
    //
    // RENAMED: relative to the calling user (host or traveler)
    //   isBlockedByMe  — calling user blocked this participant
    //   isBlockedMe    — this participant blocked the calling user
    //
    const [blockedByMeRows, blockedMeRows] = await Promise.all([
      prisma.blockList.findMany({
        where: {
          blockerId: user.id,
          blockedUserId: { in: participantIds },
        },
        select: { blockedUserId: true },
      }),
      prisma.blockList.findMany({
        where: {
          blockerId: { in: participantIds },
          blockedUserId: user.id,
        },
        select: { blockerId: true },
      }),
    ]);

    const blockedByMeSet = new Set(blockedByMeRows.map((r) => r.blockedUserId));
    const blockedMeSet = new Set(blockedMeRows.map((r) => r.blockerId));

    // ── 4. Fetch friendship relationships in bulk ─────────────────
    //
    // RENAMED: isFriendWithMe — friendship between calling user and participant
    //
    const friendships = await prisma.friends.findMany({
      where: {
        OR: [
          { senderId: user.id, receiverId: { in: participantIds } },
          { senderId: { in: participantIds }, receiverId: user.id },
        ],
      },
      select: { id: true, senderId: true, receiverId: true, status: true },
    });

    const friendshipMap = new Map<string, string>();
    friendships.forEach((f) => {
      const otherId = f.senderId === user.id ? f.receiverId : f.senderId;
      friendshipMap.set(otherId, f.id);
    });

    const friendSet = new Set(
      friendships
        .filter((f) => f.status === 'ACCEPTED')
        .map((f) => (f.senderId === user.id ? f.receiverId : f.senderId))
    );

    const pendingSentSet = new Set(
      friendships
        .filter((f) => f.status === 'PENDING' && f.senderId === user.id)
        .map((f) => f.receiverId)
    );

    const pendingReceivedSet = new Set(
      friendships
        .filter((f) => f.status === 'PENDING' && f.receiverId === user.id)
        .map((f) => f.senderId)
    );

    // ── 5. Fetch existing PRIVATE conversations ───────────────────
    const privateConversations = await prisma.conversation.findMany({
      where: {
        type: ConversationType.PRIVATE,
        deletedAt: null,
        participants: {
          some: { userId: user.id },
        },
        AND: [
          {
            participants: {
              some: { userId: { in: participantIds } },
            },
          },
        ],
      },
      select: {
        id: true,
        participants: {
          select: { userId: true },
        },
      },
    });

    const conversationMap = new Map<string, string>();
    for (const conv of privateConversations) {
      const otherUser = conv.participants.find((p) => p.userId !== user.id);
      if (otherUser) {
        conversationMap.set(otherUser.userId, conv.id);
      }
    }

    // ── 6. Shape participants with flags ──────────────────────────
    const participants = rawParticipants.map((p) => {
      const isFriendWithMe = friendSet.has(p.participantId);
      const conversationId =
        isFriendWithMe && conversationMap.has(p.participantId)
          ? conversationMap.get(p.participantId)!
          : null;
      const friendshipId = friendshipMap.get(p.participantId) || null;

      let connectionStatus:
        | 'ADD_ORCA'
        | 'PENDING'
        | 'ACCEPT'
        | 'FRIEND'
        | 'BLOCKED_BY_ME'
        | 'BLOCKED_ME' = 'ADD_ORCA';
      if (blockedByMeSet.has(p.participantId)) {
        connectionStatus = 'BLOCKED_BY_ME';
      } else if (blockedMeSet.has(p.participantId)) {
        connectionStatus = 'BLOCKED_ME';
      } else if (isFriendWithMe) {
        connectionStatus = 'FRIEND';
      } else if (pendingSentSet.has(p.participantId)) {
        connectionStatus = 'PENDING';
      } else if (pendingReceivedSet.has(p.participantId)) {
        connectionStatus = 'ACCEPT';
      }

      return {
        role: p.role,
        joinedAt: p.joinedAt,
        user: {
          id: p.user.id,
          isPremium: p.user.isPremium,
          name: p.user.profile?.name ?? null,
          avatar: p.user.profile?.avatar ?? null,
          gender: p.user.profile?.gender ?? null,
          age: p.user.profile?.age ?? null,
        },
        connectionStatus,
        conversationId,
        friendshipId,
      };
    });

    // ── 7. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: participants,
      meta: {
        totalParticipants: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get event participants service');
  }
};

export const getEventWaitListService = async ({
  event,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}: {
  event: Event;
  page?: number;
  limit?: number;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── 1. Fetch paginated waitlist + total count ───────────────────
    const [rawWaitList, totalCount] = await prisma.$transaction([
      prisma.waitList.findMany({
        where: { eventId: event.id },
        select: {
          joinedAt: true,
          user: {
            select: {
              id: true,
              isPremium: true,
              profile: {
                select: {
                  name: true,
                  avatar: true,
                  gender: true,
                  age: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip: offset,
        take: limit,
      }),

      prisma.waitList.count({
        where: { eventId: event.id },
      }),
    ]);

    // ── 2. Shape response ─────────────────────────────────────────
    const waitList = rawWaitList.map((w) => ({
      joinedAt: w.joinedAt,
      user: {
        id: w.user.id,
        isPremium: w.user.isPremium,
        name: w.user.profile?.name ?? null,
        avatar: w.user.profile?.avatar ?? null,
        gender: w.user.profile?.gender ?? null,
        age: w.user.profile?.age ?? null,
      },
    }));

    // ── 3. Paginate & respond ───────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: waitList,
      meta: {
        totalWaitListed: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get event waitlist service');
  }
};

export const updateEventService = async ({
  event,
  payload,
}: {
  event: Event;
  payload: Partial<TUpdateEventInformationPayload>;
}): Promise<unknown> => {
  try {
    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: payload,
    });
    return updatedEvent;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in update event service');
  }
};

export const removeParticipantsFromEventService = async ({
  event,
  participantId,
}: {
  event: Event;
  participantId: string;
}): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Remove from event participants ─────────────────────────
      //
      // FIXED: role is not part of @@unique([eventId, participantId])
      // so it goes as a sibling filter, not inside the unique key
      //
      await tx.eventParticipants.delete({
        where: {
          eventId_participantId: {
            eventId: event.id,
            participantId,
          },
          role: EventRole.TRAVELER,
        },
      });

      // ── 2. ADDED: Remove from the event's GROUP conversation ──────
      //
      // Find the conversation linked to this event and remove the
      // participant from ConversationParticipant
      //
      const conversation = await tx.conversation.findUnique({
        where: { eventId: event.id },
        select: { id: true },
      });

      if (conversation) {
        await tx.conversationParticipant.delete({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: participantId,
            },
          },
        });
      }
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in remove participants from event service'
    );
  }
};

export const deleteEventService = async ({
  event,
}: {
  event: Event;
}): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Soft delete the event ──────────────────────────────────
      await tx.event.update({
        where: { id: event.id },
        data: {
          eventStatus: EventStatus.DELETED,
          deletedAt: new Date(),
        },
      });

      // ── 2. Soft delete the linked GROUP conversation ──────────────
      //
      // Conversation has a deletedAt field — set it to now so the
      // conversation is hidden but data is preserved.
      //
      await tx.conversation.updateMany({
        where: { eventId: event.id },
        data: { deletedAt: new Date() },
      });
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in delete event service');
  }
};

export const retrieveMyAdventureLogsService = async ({
  user,
  eventStatus,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}: {
  user: User;
  eventStatus: EventStatus;
  page?: number;
  limit?: number;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── Single query: EventParticipants → Event → EventEventType → EventType ──
    //
    // CHANGED: Adventure Log = events the logged-in user CREATED, i.e.
    // where their role is HOST. Not all events they're a participant in.
    //
    const [myParticipations, totalCount] = await prisma.$transaction([
      prisma.eventParticipants.findMany({
        where: {
          participantId: user.id,
          role: EventRole.HOST, // CHANGED: scope to events I host only
          event: {
            eventStatus,
            deletedAt: null,
          },
        },
        orderBy: { event: { startDate: 'asc' } },
        skip: offset,
        take: limit,
        select: {
          role: true,

          // ── JOIN 1: Event ──────────────────────────────────────────────
          event: {
            select: {
              id: true,
              eventName: true,
              startDate: true,
              eventStatus: true,
              lat: true,
              lng: true,
              maxParticipantsCount: true,

              // ── JOIN 2: EventEventType → EventType ─────────────────────
              eventTypes: {
                select: {
                  eventType: {
                    select: {
                      id: true,
                      title: true,
                      thumbnail: true,
                    },
                  },
                },
              },

              // ── JOIN 3: count for "9/4 orcas" badge ─────────────────────
              _count: {
                select: { eventParticipants: { where: { leftAt: null } } },
              },
            },
          },
        },
      }),

      prisma.eventParticipants.count({
        where: {
          participantId: user.id,
          role: EventRole.HOST, // CHANGED
          event: {
            eventStatus,
            deletedAt: null,
          },
        },
      }),
    ]);

    // ── Shape response ────────────────────────────────────────────────────
    const data = myParticipations.map((participation) => {
      const { event } = participation;
      const participantCount = event._count.eventParticipants;
      const spotsLeft = Math.max(
        0,
        event.maxParticipantsCount - participantCount
      );

      return {
        id: event.id,
        eventName: event.eventName,
        startDate: event.startDate,
        eventStatus: event.eventStatus,
        lat: event.lat,
        lng: event.lng,
        maxParticipantsCount: event.maxParticipantsCount,
        participantCount,
        spotsLeft,

        // EventType badge (thumbnail + title in UI)
        eventType: event.eventTypes[0]?.eventType ?? null,
      };
    });

    // ── Pagination meta ───────────────────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data,
      meta: {
        totalEvents: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in retrieve adventure logs service'
    );
  }
};

export const getMyActivityService = async ({
  user,
  eventStatus,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}: {
  user: User;
  eventStatus?: EventStatus;
  page?: number;
  limit?: number;
}): Promise<unknown> => {
  try {
    // ── 1. Resolve status filter ───────────────────────────────────
    //
    // UPCOMING | COMPLETED | ONGOING → filter by that status
    // anything else / not passed     → show all except DELETED
    //
    const allowedStatuses: EventStatus[] = [
      EventStatus.UPCOMING,
      EventStatus.COMPLETED,
      EventStatus.ONGOING,
    ];

    const statusFilter =
      eventStatus && allowedStatuses.includes(eventStatus)
        ? { eventStatus }
        : { eventStatus: { not: EventStatus.DELETED } };

    // ── 2. Pagination offset ───────────────────────────────────────
    const offset = (page - 1) * limit;

    // ── 3. Shared where clause ──────────────────────────────────────
    //
    // Scope: events where the logged-in user is an active TRAVELER
    // FIXED: added leftAt: null — exclude events the user has left
    //
    const sharedWhere = {
      ...statusFilter,
      eventParticipants: {
        some: {
          participantId: user.id,
          role: EventRole.TRAVELER,
          leftAt: null, // FIXED: only show events user hasn't left
        },
      },
    };

    // ── 4. Fetch events + total count ─────────────────────────────
    const [rawEvents, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        where: sharedWhere,
        select: {
          id: true,
          eventName: true,
          startDate: true,
          eventStatus: true,
          lat: true,
          lng: true,
          maxParticipantsCount: true,

          // EventType badge
          eventTypes: {
            select: {
              eventType: {
                select: {
                  id: true,
                  title: true,
                  thumbnail: true,
                },
              },
            },
          },

          // Count only
          _count: {
            select: { eventParticipants: { where: { leftAt: null } } },
          },
        },
        orderBy: { startDate: 'asc' },
        skip: offset,
        take: limit,
      }),

      prisma.event.count({
        where: sharedWhere,
      }),
    ]);

    // ── 5. Shape each event for the activity card ──────────────────
    const events = rawEvents.map((event) => {
      const participantCount = event._count.eventParticipants;
      const availableSlots = Math.max(
        0,
        event.maxParticipantsCount - participantCount
      );

      return {
        id: event.id,
        eventName: event.eventName,
        startDate: event.startDate,
        eventStatus: event.eventStatus,
        lat: event.lat,
        lng: event.lng,
        maxParticipantsCount: event.maxParticipantsCount,
        participantCount,
        availableSlots,
        eventType: event.eventTypes[0]?.eventType ?? null,
      };
    });

    // ── 6. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: events,
      meta: {
        totalEvents: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get my activity service');
  }
};

export const getMySingleEventService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<unknown> => {
  try {
    // ── 1. Fetch event, scoped to logged-in user being a TRAVELER ──
    const enrichedEvent = await prisma.event.findFirstOrThrow({
      where: {
        id: event.id,
        eventParticipants: {
          some: {
            participantId: user.id,
            role: EventRole.TRAVELER,
          },
        },
      },
      select: {
        id: true,
        eventName: true,
        description: true,
        startDate: true,
        endDate: true,
        maxParticipantsCount: true,
        eventStatus: true,
        lat: true,
        lng: true,

        // EventType badge
        eventTypes: {
          select: {
            eventType: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },

        // Count instead of full participants array
        _count: {
          select: { eventParticipants: { where: { leftAt: null } } },
        },

        // Only fetch the host row
        eventParticipants: {
          where: { role: EventRole.HOST },
          take: 1,
          select: {
            user: {
              select: {
                id: true,
                profile: {
                  select: { name: true, avatar: true },
                },
              },
            },
          },
        },

        // ADDED: conversation linked to this event
        conversation: {
          select: { id: true },
        },
      },
    });

    // ── 2. Derive computed fields ───────────────────────────────────
    const participantCount = enrichedEvent._count.eventParticipants;
    const availableSlots = Math.max(
      0,
      enrichedEvent.maxParticipantsCount - participantCount
    );

    const hostParticipant = enrichedEvent.eventParticipants[0] ?? null;

    // ── 3. Return slim event for the activity detail card ──────────
    return {
      id: enrichedEvent.id,
      eventName: enrichedEvent.eventName,
      description: enrichedEvent.description,
      startDate: enrichedEvent.startDate,
      endDate: enrichedEvent.endDate,
      maxParticipantsCount: enrichedEvent.maxParticipantsCount,
      eventStatus: enrichedEvent.eventStatus,
      lat: enrichedEvent.lat,
      lng: enrichedEvent.lng,

      eventType: enrichedEvent.eventTypes[0]?.eventType ?? null,

      // ADDED: conversationId for the pod chat
      conversationId: enrichedEvent.conversation?.id ?? null,

      participantCount,
      availableSlots,

      host: hostParticipant
        ? {
            id: hostParticipant.user.id,
            name: hostParticipant.user.profile?.name ?? null,
            avatar: hostParticipant.user.profile?.avatar ?? null,
          }
        : null,

      currentUser: {
        isParticipant: true,
        role: EventRole.TRAVELER,
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get my single event service');
  }
};

export const joinEventService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Add user as TRAVELER to the event ──────────────────────
      await tx.eventParticipants.create({
        data: {
          eventId: event.id,
          participantId: user.id,
          role: EventRole.TRAVELER,
        },
      });

      // ── 2. ADDED: Add user to the event's GROUP conversation ──────
      //
      // Fetch the conversation linked to this event and add the
      // joining user as a ConversationParticipant
      //
      const conversation = await tx.conversation.findUnique({
        where: { eventId: event.id },
        select: { id: true },
      });

      if (conversation) {
        await tx.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            userId: user.id,
          },
        });
      }
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in join event service');
  }
};

export const joinWaitListService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<unknown> => {
  try {
    const waitListEntry = await prisma.waitList.create({
      data: {
        eventId: event.id,
        userId: user.id,
      },
    });

    return waitListEntry;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in join waitlist service');
  }
};

export const leaveEventService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Soft delete — set leftAt on the participant row ────────
      await tx.eventParticipants.update({
        where: {
          eventId_participantId: {
            eventId: event.id,
            participantId: user.id,
          },
          role: EventRole.TRAVELER,
        },
        data: {
          leftAt: new Date(),
        },
      });

      // ── 2. ADDED: Remove from the event's GROUP conversation ──────
      const conversation = await tx.conversation.findUnique({
        where: { eventId: event.id },
        select: { id: true },
      });

      if (conversation) {
        await tx.conversationParticipant.delete({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: user.id,
            },
          },
        });
      }

      // ── 3. Late cancellation strike logic ──────────────────────────
      //
      // If the user leaves within 6 hours of the event start,
      // apply 1 strike for LATE_CANCELLATION.
      //
      const now = new Date();
      const hoursUntilStart =
        (event.startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilStart >= 0 && hoursUntilStart < 6) {
        // Record the strike
        await tx.strike.create({
          data: {
            userId: user.id,
            points: 1,
            reason: StrikeReason.LATE_CANCELLATION,
          },
        });

        // Update user strike count and date
        const updatedStrikeCount = user.strikeCount + 1;
        let penaltyEndDate: Date | null = null;

        if (updatedStrikeCount >= 5) {
          // 1 month ban
          penaltyEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else if (updatedStrikeCount >= 3) {
          // 1 week ban
          penaltyEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            strikeCount: updatedStrikeCount,
            lastStrikeDate: now,
            ...(penaltyEndDate && { penaltyEndDate }),
          },
        });
      }
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in leave event service');
  }
};
export const getEventJournalService = async ({
  limit = DEFAULT_LIMIT,
  page = DEFAULT_PAGE,
  event,
  user,
}: {
  event: Event;
  user: User;
  page: number | undefined;
  limit: number | undefined;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── 1. Fetch participants + total count ───────────────────────
    //
    // Join: EventParticipants → User → Profile
    // All roles included (HOST + TRAVELER)
    //
    const [rawParticipants, totalCount] = await prisma.$transaction([
      prisma.eventParticipants.findMany({
        where: {
          eventId: event.id,
        },
        include: {
          user: {
            select: {
              id: true,
              isPremium: true,
              isProfileSetup: true,
              profile: {
                select: {
                  name: true,
                  avatar: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
        skip: offset,
        take: limit,
      }),

      prisma.eventParticipants.count({
        where: {
          eventId: event.id,
          leftAt: null,
        },
      }),
    ]);

    // ── 2. Fetch all ratings the calling user has given in this event ──
    //
    // Join: EventRating where raterId = user.id and eventId = event.id
    // Used to flag isRated and pre-fill rating per participant
    //
    const givenRatings = await prisma.eventRating.findMany({
      where: {
        eventId: event.id,
        raterId: user.id,
      },
      select: {
        ratedUserId: true,
        rating: true,
        review: true,
      },
    });

    // Build a lookup map: ratedUserId → { rating, review }
    const ratingMap = new Map(
      givenRatings.map((r) => [
        r.ratedUserId,
        { rating: r.rating, review: r.review },
      ])
    );

    // ── 3. Shape each participant with rating status ───────────────
    const participants = rawParticipants.map((p) => {
      const existingRating = ratingMap.get(p.participantId) ?? null;

      return {
        participantId: p.participantId,
        role: p.role,
        joinedAt: p.joinedAt,
        user: {
          id: p.user.id,
          isPremium: p.user.isPremium,
          isProfileSetup: p.user.isProfileSetup,
          name: p.user.profile?.name ?? null,
          avatar: p.user.profile?.avatar ?? null,
          bio: p.user.profile?.bio ?? null,
        },
        // Rating context for the calling user
        isRated: !!existingRating,
        rating: existingRating?.rating ?? null,
        review: existingRating?.review ?? null,
      };
    });

    // ── 4. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: participants,
      meta: {
        totalParticipants: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get event journal service');
  }
};

export const submitEventJournalService = async ({
  event,
  rating,
  participantId,
  user,
}: {
  event: Event;
  rating: number;
  participantId: string;
  user: User;
}): Promise<void> => {
  try {
    // ── 1. Upsert the rating ──────────────────────────────────────
    //
    // If the calling user has already rated this participant in this
    // event, update the existing row. Otherwise create a new one.
    // Unique constraint: [eventId, raterId, ratedUserId]
    //
    await prisma.eventRating.upsert({
      where: {
        eventId_raterId_ratedUserId: {
          eventId: event.id,
          raterId: user.id,
          ratedUserId: participantId,
        },
      },
      update: {
        rating,
      },
      create: {
        eventId: event.id,
        raterId: user.id,
        ratedUserId: participantId,
        rating,
      },
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in submit event journal service');
  }
};

export const getEventSummaryService = async ({
  event,
  user,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
}: {
  event: Event;
  user: User;
  page?: number;
  limit?: number;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── 1. Fetch enriched event ───────────────────────────────────
    //
    // Join: EventParticipants → User → Profile
    // Used for both event summary stats and the orca list
    //
    const enrichedEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      include: {
        eventParticipants: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    name: true,
                    avatar: true,
                    bio: true,
                  },
                },
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    // ── 2. Event summary stats ────────────────────────────────────
    const totalParticipants = enrichedEvent.eventParticipants.length;

    // ── 3. Fetch friendship statuses for the calling user ─────────
    //
    // Pull all friendship rows where calling user is sender OR receiver
    // Used to derive the button state per orca in the list
    //
    const friendships = await prisma.friends.findMany({
      where: {
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      select: {
        senderId: true,
        receiverId: true,
        status: true,
      },
    });

    // Build a lookup map: otherUserId → { status, senderId }
    const friendshipMap = new Map(
      friendships.map((f) => {
        const otherUserId = f.senderId === user.id ? f.receiverId : f.senderId;
        return [otherUserId, { status: f.status, senderId: f.senderId }];
      })
    );

    // ── 4. Build the orca list (excluding the calling user) ───────
    //
    // Paginate in-memory since participants are already fetched
    //
    const otherParticipants = enrichedEvent.eventParticipants.filter(
      (p) => p.participantId !== user.id
    );

    const totalOrcas = otherParticipants.length;
    const paginatedOrcas = otherParticipants.slice(offset, offset + limit);

    const orcas = paginatedOrcas.map((p) => {
      const friendship = friendshipMap.get(p.participantId) ?? null;

      // Derive button state:
      // - ACCEPTED            → "FRIEND"
      // - PENDING (user sent) → "PENDING"
      // - PENDING (user recv) → "ACCEPT"
      // - no row              → "ADD_ORCA"
      let connectionStatus:
        | 'ADD_ORCA'
        | 'PENDING'
        | 'ACCEPT'
        | 'FRIEND'
        | 'BLOCKED_BY_ME'
        | 'BLOCKED_ME' = 'ADD_ORCA';

      if (friendship) {
        if (friendship.status === 'ACCEPTED') {
          connectionStatus = 'FRIEND';
        } else if (friendship.status === 'PENDING') {
          if (friendship.senderId === user.id) {
            connectionStatus = 'PENDING';
          } else {
            connectionStatus = 'ACCEPT';
          }
        }
      }

      return {
        participantId: p.participantId,
        role: p.role,
        name: p.user.profile?.name ?? null,
        avatar: p.user.profile?.avatar ?? null,
        bio: p.user.profile?.bio ?? null,
        connectionStatus,
      };
    });

    // ── 5. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalOrcas / limit);

    return {
      // Event summary block
      summary: {
        eventId: enrichedEvent.id,
        eventName: enrichedEvent.eventName,
        startDate: enrichedEvent.startDate,
        endDate: enrichedEvent.endDate,
        lat: enrichedEvent.lat,
        lng: enrichedEvent.lng,
        totalParticipants,
      },

      // // Orca connection list
      // orcas: {
      //   data: orcas,
      //   meta: {
      //     totalOrcas,
      //     totalPages,
      //     links: {
      //       currentPage: page,
      //       nextPage: page < totalPages ? page + 1 : null,
      //       previousPage: page > 1 ? page - 1 : null,
      //       firstPage: 1,
      //       lastPage: totalPages || 1,
      //     },
      //   },
      // },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get event summary service');
  }
};

export const getSingleEventOrcaService = async ({
  event,
  orcaId,
  user,
}: {
  event: Event;
  orcaId: string;
  user: User;
}): Promise<unknown> => {
  try {
    // ── 1. Fetch orca's user + profile ────────────────────────────
    const orca = await prisma.user.findUniqueOrThrow({
      where: { id: orcaId },
      select: {
        id: true,
        isPremium: true,
        isProfileSetup: true,
        profile: {
          select: {
            name: true,
            avatar: true,
            cover: true,
            bio: true,
            location: true,
            gender: true,
            age: true,
            profileInterest: true,
            countryVisited: true,
          },
        },
      },
    });

    // ── 2. Fetch orca's role in this event ────────────────────────
    const eventParticipant = await prisma.eventParticipants.findUniqueOrThrow({
      where: {
        eventId_participantId: {
          eventId: event.id,
          participantId: orcaId,
        },
      },
      select: { role: true, joinedAt: true },
    });

    // ── 3. Fetch event basic details ──────────────────────────────
    const enrichedEvent = await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      select: {
        id: true,
        eventName: true,
        eventStatus: true,
        startDate: true,
        eventTypes: {
          select: {
            eventType: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
      },
    });

    // ── 4. Resolve interest objects from profileInterest IDs ───────
    const interests = await prisma.interest.findMany({
      where: {
        id: { in: orca.profile?.profileInterest ?? [] },
        isDeleted: false,
      },
      select: {
        id: true,
        interestName: true,
        interestIcon: true,
      },
    });

    // ── 5. Events joined count ────────────────────────────────────
    const eventsJoinedCount = await prisma.eventParticipants.count({
      where: {
        participantId: orcaId,
        leftAt: null,
        event: {
          eventStatus: { not: EventStatus.DELETED },
        },
      },
    });

    // ── 6. Connections count ──────────────────────────────────────
    const connectionsCount = await prisma.friends.count({
      where: {
        OR: [
          { senderId: orcaId, status: FriendshipStatus.ACCEPTED },
          { receiverId: orcaId, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    // ── 7. Connection status between calling user and orca ────────
    const friendship = await prisma.friends.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: orcaId },
          { senderId: orcaId, receiverId: user.id },
        ],
      },
      select: { id: true, status: true, senderId: true },
    });

    let connectionStatus:
      | 'ADD_ORCA'
      | 'PENDING'
      | 'ACCEPT'
      | 'FRIEND'
      | 'BLOCKED_BY_ME'
      | 'BLOCKED_ME' = 'ADD_ORCA';

    if (friendship) {
      if (friendship.status === 'ACCEPTED') {
        connectionStatus = 'FRIEND';
      } else if (friendship.status === 'PENDING') {
        if (friendship.senderId === user.id) {
          connectionStatus = 'PENDING';
        } else {
          connectionStatus = 'ACCEPT';
        }
      }
    }

    // ── 8. ADDED: Fetch existing PRIVATE conversation ─────────────
    //
    // Only look up if already friends — otherwise conversationId is null
    //
    let conversationId: string | null = null;

    if (connectionStatus === 'FRIEND') {
      const privateConversation = await prisma.conversation.findFirst({
        where: {
          type: ConversationType.PRIVATE,
          deletedAt: null,
          participants: {
            some: { userId: user.id },
          },
          AND: [
            {
              participants: {
                some: { userId: orcaId },
              },
            },
          ],
        },
        select: { id: true },
      });

      conversationId = privateConversation?.id ?? null;
    }

    // ── 9. Return orca profile ─────────────────────────────────────
    return {
      id: orca.id,
      isPremium: orca.isPremium,
      isProfileSetup: orca.isProfileSetup,

      // Profile fields
      name: orca.profile?.name ?? null,
      avatar: orca.profile?.avatar ?? null,
      cover: orca.profile?.cover ?? null,
      bio: orca.profile?.bio ?? null,
      location: orca.profile?.location ?? null,
      gender: orca.profile?.gender ?? null,
      age: orca.profile?.age ?? null,
      profileInterest: interests,
      countryVisited: orca.profile?.countryVisited ?? [],

      // Event context
      eventRole: eventParticipant.role,
      joinedAt: eventParticipant.joinedAt,

      // Event basic details
      event: {
        id: enrichedEvent.id,
        eventName: enrichedEvent.eventName,
        eventStatus: enrichedEvent.eventStatus,
        startDate: enrichedEvent.startDate,
        eventType: enrichedEvent.eventTypes[0]?.eventType ?? null,
      },

      // Stats
      eventsJoinedCount,
      connectionsCount,

      // Calling user → orca relationship
      connectionStatus,

      // ADDED: private conversationId — populated if already friends
      // and a PRIVATE conversation exists, null otherwise
      conversationId,
      friendshipId: friendship?.id ?? null,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in get get single event orca service'
    );
  }
};
export const getEventsForAdminService = async ({
  limit = DEFAULT_LIMIT,
  page = DEFAULT_PAGE,
  search,
}: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── 1. Shared where clause ────────────────────────────────────
    //
    // Exclude DELETED events.
    // Search is optional — case-insensitive match on eventName.
    //
    const sharedWhere = {
      eventStatus: { not: EventStatus.DELETED },
      ...(search
        ? { eventName: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    // ── 2. Fetch events + total count ─────────────────────────────
    const [rawEvents, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        where: sharedWhere,
        select: {
          id: true,
          eventName: true,
          startDate: true,
          endDate: true,
          eventStatus: true,
          lat: true,
          lng: true,
          isPrivate: true,
          createdAt: true,

          // Event type badge
          eventTypes: {
            select: {
              eventType: {
                select: {
                  id: true,
                  title: true,
                  thumbnail: true,
                },
              },
            },
          },

          // Participant count + host
          eventParticipants: {
            where: { leftAt: null },
            select: {
              role: true,
              participantId: true,
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { name: true, avatar: true },
                  },
                },
              },
            },
          },

          // Max capacity
          maxParticipantsCount: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),

      prisma.event.count({
        where: sharedWhere,
      }),
    ]);

    // ── 3. Shape response ─────────────────────────────────────────
    const events = rawEvents.map((event) => {
      const host =
        event.eventParticipants.find((p) => p.role === EventRole.HOST) ?? null;
      const participantCount = event.eventParticipants.length;
      const spotsLeft = Math.max(
        0,
        event.maxParticipantsCount - participantCount
      );

      return {
        id: event.id,
        eventName: event.eventName,
        startDate: event.startDate,
        endDate: event.endDate,
        eventStatus: event.eventStatus,
        lat: event.lat,
        lng: event.lng,
        isPrivate: event.isPrivate,
        createdAt: event.createdAt,
        maxParticipantsCount: event.maxParticipantsCount,
        participantCount,
        spotsLeft,
        eventType: event.eventTypes[0]?.eventType ?? null,
        host: host
          ? {
              id: host.user.id,
              name: host.user.profile?.name ?? null,
              avatar: host.user.profile?.avatar ?? null,
            }
          : null,
      };
    });

    // ── 4. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: events,
      meta: {
        totalEvents: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred is get events for admin service');
  }
};

// ── Accept waitlist → join event ──────────────────────────────────────────────
export const acceptWaitListService = async ({
  event,
  participantId,
}: {
  event: Event;
  participantId: string;
}): Promise<unknown> => {
  try {
    const participant = await prisma.$transaction(async (tx) => {
      // ── 1. Remove from waitlist ───────────────────────────────────
      await tx.waitList.delete({
        where: {
          eventId_userId: {
            eventId: event.id,
            userId: participantId,
          },
        },
      });

      // ── 2. Add as TRAVELER to event ───────────────────────────────
      const participant = await tx.eventParticipants.create({
        data: {
          eventId: event.id,
          participantId,
          role: EventRole.TRAVELER,
        },
        select: {
          participantId: true,
          role: true,
          joinedAt: true,
        },
      });

      // ── 3. ADDED: Add to the event's GROUP conversation ───────────
      const conversation = await tx.conversation.findUnique({
        where: { eventId: event.id },
        select: { id: true },
      });

      if (conversation) {
        await tx.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            userId: participantId,
          },
        });
      }

      return participant;
    });

    return participant;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in accept waitlist service');
  }
};
// ── Remove from waitlist ──────────────────────────────────────────────────────
export const removeFromWaitListService = async ({
  event,
  participantId,
}: {
  event: Event;
  participantId: string;
}): Promise<void> => {
  try {
    await prisma.waitList.delete({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: participantId,
        },
      },
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in remove from waitlist service');
  }
};

// ── Feasibility check service ────────────────────────────────────────────────
export const getEventFeasibilityService = async ({
  event,
  user,
}: {
  event: Event;
  user: User;
}): Promise<IFeasibilityResult> => {
  try {
    const warnings: IFeasibilityWarning[] = [];

    // ── 1. Distance warning ──────────────────────────────────────────
    const redisClient = getRedisClient();
    const cachedLocation = await redisClient.get(`user:location:${user.id}`);

    if (cachedLocation) {
      const parsed = JSON.parse(cachedLocation) as { lat: number; lng: number };
      const distanceMap = await buildDistanceMap(
        [event.id],
        parsed.lat,
        parsed.lng
      );
      const distanceKm = distanceMap[event.id] ?? 0;

      if (distanceKm > 50) {
        warnings.push({
          type: 'DISTANCE',
          message: `This event is ${distanceKm.toFixed(1)} km away from your current location. Consider the travel effort before committing.`,
          metadata: { distanceKm },
        });
      }

      // ── 2. Travel time warning ───────────────────────────────────────
      // Estimate based on ~60 km/h average travel speed
      if (distanceKm > 30) {
        const estimatedTravelHours = distanceKm / 60;
        warnings.push({
          type: 'TRAVEL_TIME',
          message: `Estimated travel time is approximately ${estimatedTravelHours.toFixed(1)} hours at average driving speed.`,
          metadata: {
            estimatedTravelHours: parseFloat(estimatedTravelHours.toFixed(1)),
            distanceKm,
          },
        });
      }
    }

    // ── 3. Overlap warning ──────────────────────────────────────────
    const overlappingEvents = await prisma.eventParticipants.findMany({
      where: {
        participantId: user.id,
        leftAt: null,
        event: {
          eventStatus: EventStatus.UPCOMING,
          OR: [
            {
              // Target event starts during an existing event
              startDate: { lte: event.endDate },
              endDate: { gte: event.startDate },
            },
          ],
        },
      },
      select: {
        event: {
          select: {
            id: true,
            eventName: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (overlappingEvents.length > 0) {
      const eventNames = overlappingEvents
        .map((e) => e.event.eventName)
        .join(', ');
      warnings.push({
        type: 'OVERLAP',
        message: `This event overlaps with your existing commitment(s): ${eventNames}. You may not be able to attend all of them.`,
        metadata: {
          overlappingCount: overlappingEvents.length,
          overlappingEventNames: eventNames,
        },
      });
    }

    return {
      canJoin: true, // Always true — freedom philosophy, just warn
      warnings,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in feasibility check service');
  }
};
