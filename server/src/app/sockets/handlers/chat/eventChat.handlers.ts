import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';
import { validateSocketPayload } from '@/app/utils/system.utils';
import {
  eventJoinSchema,
  EventJoinPayload,
} from '@/app/sockets/schemas/chat.schemas';
import logger from '@/app/configs/logger.configs';

// ─── Join Event Chat ──────────────────────────────────────────────
export const handleEventJoin = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, eventJoinSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Invalid event ID',
    });
    return;
  }

  const { eventId } = validated.data as EventJoinPayload;

  // Find the conversation associated with this event
  const conversation = await prisma.conversation.findUnique({
    where: { eventId },
    select: { id: true },
  });

  if (!conversation) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Event chat not found',
    });
    return;
  }

  // Verify user is a participant of the conversation (event participant)
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId: conversation.id, userId },
    },
  });
  if (!isParticipant) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'You are not a participant of this event',
    });
    return;
  }

  // Check if soft-deleted
  const settings = await prisma.conversationSettings.findUnique({
    where: {
      conversationId_userId: { conversationId: conversation.id, userId },
    },
  });
  if (settings?.deletedAt) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Conversation has been deleted',
    });
    return;
  }

  socket.join(`conversation:${conversation.id}`);
  socket.emit(SOCKET_EVENTS.EVENT_JOINED, {
    eventId,
    conversationId: conversation.id,
  });
  logger.debug(`User ${userId} joined event chat for event ${eventId}`);
};

// ─── Leave Event Chat ─────────────────────────────────────────────
export const handleEventLeave = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, eventJoinSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Invalid event ID',
    });
    return;
  }

  const { eventId } = validated.data as EventJoinPayload;

  // Find conversation
  const conversation = await prisma.conversation.findUnique({
    where: { eventId },
    select: { id: true },
  });

  if (conversation) {
    socket.leave(`conversation:${conversation.id}`);
  }

  socket.emit(SOCKET_EVENTS.EVENT_LEFT, { eventId });
  logger.debug(`User ${userId} left event chat for event ${eventId}`);
};
