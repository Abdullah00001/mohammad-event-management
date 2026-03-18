import { EventRole, User } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import { TEventCreatePayload } from '@/app/modules/event/event.schemas';

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
