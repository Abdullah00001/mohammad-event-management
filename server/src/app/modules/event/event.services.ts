import { EventRole, User } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import {
  EventQueryParams,
  TEventCreatePayload,
} from '@/app/modules/event/event.schemas';
import { getCountryFromCoords } from '@/app/utils/system.utils';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@/const';

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
}: {
  query: EventQueryParams;
}): Promise<void> => {
  try {
    const {
      date,
      distance,
      eventType,
      lng,
      lat,
      limit = DEFAULT_LIMIT,
      maxOrcas,
      page = DEFAULT_PAGE,
      time,
    } = query;
    const offset = (page - 1) * limit;
    const isNearbyMode = distance !== undefined;
    const countryCode = await getCountryFromCoords(lat, lng);
    console.log(countryCode);
    /**
     * [ ] if theres any none required query than its will retrieve the events from his country with default page 1 limit 10
     * query look like /events?lat=&lng=
     * response look like
     *
     * {
     * success: true
     * status: 200
     * message:
     * data:[]
     * meta:
     * totalEvents:
     * totalPages:
     * links:{
     *    currentPage:
     *    nextPage:
     *    previousPage:
     *    firstPage:
     *    lastPage:
     * }
     * }
     *
     */
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in get events service');
  }
};
