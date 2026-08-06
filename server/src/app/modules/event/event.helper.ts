import prisma from '@/app/configs/db.configs';
import { EARTH_RADIUS_KM } from '@/const';
import { EventListingResult } from '@/app/modules/event/event.types';
import { Prisma } from '@prisma/client';

/**
 * Returns a Prisma.sql fragment for the Haversine distance predicate.
 *
 * All numeric values are emitted via Prisma.raw (interpolated as SQL
 * literals, not parameters) so Postgres sees plain float literals and
 * there is zero risk of a text↔uuid or text↔float type-cast error.
 *
 * Formula:
 *   d = 2R · asin( √( sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2) ) )
 */
export function buildHaversineFragment(
  lat: number,
  lng: number,
  radiusKm: number
): Prisma.Sql {
  // Prisma.raw embeds the value literally into the SQL string —
  // safe here because these are server-controlled numbers, not user input.
  const R = Prisma.raw(String(EARTH_RADIUS_KM));
  const pLat = Prisma.raw(String(lat));
  const pLng = Prisma.raw(String(lng));
  const pRadKm = Prisma.raw(String(radiusKm));

  return Prisma.sql`
    (
      ${R} * 2.0 * asin(
        sqrt(
          power(sin(radians(e.lat - ${pLat}) / 2.0), 2) +
          cos(radians(${pLat})) *
          cos(radians(e.lat)) *
          power(sin(radians(e.lng - ${pLng}) / 2.0), 2)
        )
      )
    ) <= ${pRadKm}
  `;
}

/**
 * Returns the ids of users the given user has blocked or is blocked by.
 * Events hosted by these users should be excluded.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const blocks = await prisma.blockList.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedUserId: userId }],
    },
    select: { blockerId: true, blockedUserId: true },
  });

  const ids = new Set<string>();
  for (const b of blocks) {
    if (b.blockerId !== userId) ids.add(b.blockerId);
    if (b.blockedUserId !== userId) ids.add(b.blockedUserId);
  }
  return [...ids];
}

/**
 * Parses a "HH:MM" time string into total minutes since midnight.
 * Used for time-range filtering.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function buildEmptyResult(
  page: number,
  _limit: number
): EventListingResult {
  return {
    data: [],
    meta: {
      totalEvents: 0,
      totalPages: 0,
      links: {
        currentPage: page,
        nextPage: null,
        previousPage: page > 1 ? page - 1 : null,
        firstPage: 1,
        lastPage: 1,
      },
    },
  };
}

/**
 * Fetches precise Haversine distances (rounded to 2 dp) for a set of
 * event IDs. Returns a map of eventId → distanceKm.
 *
 * Uses Prisma.sql + Prisma.join so UUIDs are passed as proper $N
 * parameters — no string interpolation, no text↔uuid cast error.
 */
export async function buildDistanceMap(
  eventIds: string[],
  refLat: number,
  refLng: number
): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};

  const R = Prisma.raw(String(EARTH_RADIUS_KM));
  const pLat = Prisma.raw(String(refLat));
  const pLng = Prisma.raw(String(refLng));

  // Prisma.join emits $1, $2, … placeholders with the correct uuid type
  // inferred by Postgres from the column comparison — no manual cast needed.
  const idList = Prisma.join(eventIds);

  const rows = await prisma.$queryRaw<{ id: string; distance_km: number }[]>(
    Prisma.sql`
      SELECT
        e.id::text,
        ROUND(
          CAST(
            ${R} * 2.0 * asin(
              sqrt(
                power(sin(radians(e.lat - ${pLat}) / 2.0), 2) +
                cos(radians(${pLat})) *
                cos(radians(e.lat)) *
                power(sin(radians(e.lng - ${pLng}) / 2.0), 2)
              )
            ) AS NUMERIC
          ), 2
        ) AS distance_km
      FROM "Event" e
      WHERE e.id IN (${idList})
    `
  );

  return Object.fromEntries(rows.map((r) => [r.id, Number(r.distance_km)]));
}
