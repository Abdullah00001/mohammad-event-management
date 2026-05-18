import { Prisma } from '@prisma/client';
import { EventRole, EventStatus, User } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import {
  EventQueryParams,
  TEventCreatePayload,
} from '@/app/modules/event/event.schemas';
import { getCountryFromCoords, timeToMinutes } from '@/app/utils/system.utils';
import { DEFAULT_LIMIT, DEFAULT_PAGE, DEFAULT_RADIUS_KM } from '@/const';
import { getRedisClient } from '@/app/configs/redis.config';
import { EventItem, EventListingResult } from '@/app/modules/event/event.types';
import { buildDistanceMap, buildEmptyResult, buildHaversineFragment, getBlockedUserIds } from './event.helper';

export const createEventService = async ({
  payload,
  user,
}: {
  user: User;
  payload: TEventCreatePayload;
}): Promise<void> => {
  try {
    const {
      description,
      eventName,
      eventTypeId,
      lat,
      long,
      maxParticipantsCount,
      startDate,
      startTime,
      isPrivate,
      endTime,
    } = payload;
    await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          description,
          eventName,
          lat,
          long,
          maxParticipantsCount,
          startDate,
          startTime,
          isPrivate,
          endTime,
        },
      });

      await tx.eventEventType.create({
        data: {
          eventTypeId,
          eventId: event.id,
        },
      });

      await tx.eventParticipants.create({
        data: {
          role: EventRole.HOST,
          eventId: event.id,
          participantId: user.id,
        },
      });
    });
    return;
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
      date,
      distance,
      eventType,
      lng: queryLng,
      lat: queryLat,
      limit = DEFAULT_LIMIT,
      maxOrcas,
      page = DEFAULT_PAGE,
      time,
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
      date ||
      distance !== undefined ||
      eventType ||
      maxOrcas !== undefined ||
      time
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

    // ── 5. Collect event IDs the user is privately invited to ─────
    //
    // Private events are only visible if:
    //   - The user is the host, OR
    //   - The user has an ACCEPTED PodInvite
    //
    const acceptedPrivateEventIds = (
      await prisma.podInvite.findMany({
        where: { inviteeId: user.id, status: 'ACCEPTED' },
        select: { eventId: true },
      })
    ).map((i) => i.eventId);

    // ── 6. Build Prisma where clause ──────────────────────────────
    const offset = (page - 1) * limit;

    // We use a raw query for the Haversine distance filter because
    // Prisma does not support computed/geo columns natively.
    // Everything else is standard Prisma ORM.

    // First, fetch IDs of events within the radius via raw SQL,
    // then let Prisma handle the rest of the filtering ergonomically.

    const haversinePredicate = buildHaversineFragment(refLat, refLng, radiusKm);
    const distanceRows = await prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT e.id::text
        FROM "Event" e
        WHERE ${haversinePredicate}
          AND e."eventStatus"::text != 'DELETED'
      `
    );

    const nearbyEventIds = distanceRows.map((r) => r.id);

    if (nearbyEventIds.length === 0) {
      return buildEmptyResult(page, limit);
    }

    // ── 7. ORM-level filters ──────────────────────────────────────

    // Date filter — match events whose startDate falls on the given date
    let dateFilter: { gte: Date; lt: Date } | undefined;
    if (date) {
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      dateFilter = { gte: dayStart, lt: dayEnd };
    }

    // Time filter — match events whose startTime is within the window.
    // `time` is expected as "HH:MM" (start of a 1-hour window) or a
    // range string "HH:MM-HH:MM". Adapt to your schema convention.
    let timeEventIds: string[] | undefined;
    if (time) {
      // Support "HH:MM" (exact hour) or "HH:MM-HH:MM" (range)
      const [startT, endT] = time.includes('-')
        ? time.split('-')
        : [time, `${String(timeToMinutes(time) / 60 + 1).padStart(2, '0')}:00`];

      const startMin = timeToMinutes(startT);
      const endMin = timeToMinutes(endT);

      // Pull all candidate events and filter in JS since startTime is
      // stored as a VARCHAR "HH:MM" string.
      const timeRows = await prisma.event.findMany({
        where: { id: { in: nearbyEventIds } },
        select: { id: true, startTime: true },
      });
      timeEventIds = timeRows
        .filter((e) => {
          const m = timeToMinutes(e.startTime);
          return m >= startMin && m < endMin;
        })
        .map((e) => e.id);
    }

    // EventType filter
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
    if (timeEventIds)
      filteredIds = filteredIds.filter((id) => timeEventIds!.includes(id));
    if (eventTypeEventIds)
      filteredIds = filteredIds.filter((id) => eventTypeEventIds!.includes(id));

    if (filteredIds.length === 0) {
      return buildEmptyResult(page, limit);
    }

    // ── 8. Fetch events with full relations ───────────────────────
    const whereClause = {
      id: { in: filteredIds },
      eventStatus: { not: EventStatus.DELETED },

      // Exclude events hosted by blocked users
      eventParticipants: {
        none: {
          participantId: { in: blockedIds },
          role: EventRole.HOST,
        },
      },

      // Private event visibility
      OR: [
        { isPrivate: false },
        {
          isPrivate: true,
          OR: [
            // User is the host
            {
              eventParticipants: {
                some: {
                  participantId: user.id,
                  role: EventRole.HOST,
                },
              },
            },
            // User has an accepted invite
            { id: { in: acceptedPrivateEventIds } },
          ],
        },
      ],

      ...(dateFilter && { startDate: dateFilter }),

      // maxOrcas = upper bound on current participant count
      ...(maxOrcas !== undefined && {
        eventParticipants: {
          none: undefined, // reset the none above — handled differently below
        },
      }),
    };

    // maxOrcas is cleaner handled via HAVING in SQL; we do a post-fetch
    // filter below to avoid complex raw SQL duplication.

    const [rawEvents, totalCount] = await prisma.$transaction([
      prisma.event.findMany({
        where: {
          id: { in: filteredIds },
          eventStatus: { not: EventStatus.DELETED },
          eventParticipants: {
            none: {
              participantId: {
                in: blockedIds.length ? blockedIds : ['__none__'],
              },
              role: EventRole.HOST,
            },
          },
          OR: [
            { isPrivate: false },
            {
              isPrivate: true,
              OR: [
                {
                  eventParticipants: {
                    some: { participantId: user.id, role: EventRole.HOST },
                  },
                },
                {
                  id: {
                    in: acceptedPrivateEventIds.length
                      ? acceptedPrivateEventIds
                      : ['__none__'],
                  },
                },
              ],
            },
          ],
          ...(dateFilter && { startDate: dateFilter }),
        },
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
          waitlists: {
            where: { userId: user.id },
            select: { id: true },
          },
        },
        orderBy: { startDate: 'asc' },
        skip: offset,
        take: limit,
      }),

      prisma.event.count({
        where: {
          id: { in: filteredIds },
          eventStatus: { not: EventStatus.DELETED },
          eventParticipants: {
            none: {
              participantId: {
                in: blockedIds.length ? blockedIds : ['__none__'],
              },
              role: EventRole.HOST,
            },
          },
          OR: [
            { isPrivate: false },
            {
              isPrivate: true,
              OR: [
                {
                  eventParticipants: {
                    some: { participantId: user.id, role: EventRole.HOST },
                  },
                },
                {
                  id: {
                    in: acceptedPrivateEventIds.length
                      ? acceptedPrivateEventIds
                      : ['__none__'],
                  },
                },
              ],
            },
          ],
          ...(dateFilter && { startDate: dateFilter }),
        },
      }),
    ]);

    // ── 9. Post-fetch processing ───────────────────────────────────

    // Build a distance lookup from the raw SQL results (already fetched)
    const distanceMap = await buildDistanceMap(filteredIds, refLat, refLng);

    let events: EventItem[] = rawEvents.map((event) => {
      const participants = event.eventParticipants;
      const host = participants.find((p) => p.role === EventRole.HOST);
      const participantCount = participants.length;
      const spotsLeft = Math.max(
        0,
        event.maxParticipantsCount - participantCount
      );
      const isJoined = participants.some((p) => p.participantId === user.id);
      const isOnWaitlist = (event.waitlists as { id: string }[]).length > 0;

      return {
        id: event.id,
        eventName: event.eventName,
        description: event.description,
        startDate: event.startDate,
        startTime: event.startTime,
        endTime: event.endTime,
        maxParticipantsCount: event.maxParticipantsCount,
        eventStatus: event.eventStatus,
        lat: event.lat,
        long: event.long,
        isPrivate: event.isPrivate,
        interests: event.interests,
        distanceKm: distanceMap[event.id] ?? 0,
        participantCount,
        spotsLeft,
        isJoined,
        isOnWaitlist,
        eventTypes: event.eventTypes.map((et) => ({
          id: et.eventType.id,
          title: et.eventType.title,
          thumbnail: et.eventType.thumbnail,
        })),
        host: host
          ? {
              id: host.user.id,
              name: host.user.profile?.name ?? null,
              avatar: host.user.profile?.avatar ?? null,
            }
          : { id: '', name: null, avatar: null },
        createdAt: event.createdAt,
      };
    });

    // Apply maxOrcas post-fetch filter
    if (maxOrcas !== undefined) {
      events = events.filter((e) => e.participantCount <= maxOrcas);
    }

    // ── 10. Country scoping (Case 1 only) ─────────────────────────
    //
    // When no filters are applied we additionally scope results to
    // the user's country so the default feed feels local.
    //
    if (!hasFilters && userCountry) {
      // Country is derived from event coordinates at query time.
      // We resolve country for each nearby event in parallel.
      const countryChecks = await Promise.all(
        events.map(async (e) => {
          const country = await getCountryFromCoords(e.lat, e.long);
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
