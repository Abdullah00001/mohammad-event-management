// server/src/app/sockets/handlers/chat/conversation.handler.ts
import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';
import { validateSocketPayload } from '@/app/utils/system.utils';
import {
  conversationIdSchema,
  ConversationIdPayload,
} from '@/app/sockets/schemas/chat.schemas';
import { isConversationParticipant } from '@/app/sockets/helpers/chat.helpers';
import logger from '@/app/configs/logger.configs';

export const handleConversationJoin = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, conversationIdSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      error: 'invalid_payload',
      details: validated.error,
    });
    return;
  }

  const { conversationId } = validated.data as ConversationIdPayload;

  if (!(await isConversationParticipant(conversationId, userId))) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'You are not a participant of this conversation',
    });
    return;
  }

  const settings = await prisma.conversationSettings.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (settings?.deletedAt) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Conversation has been deleted',
    });
    return;
  }

  const now = new Date();
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: now },
  });

  socket.join(`conversation:${conversationId}`);
  socket.emit(SOCKET_EVENTS.CONVERSATION_JOINED, { conversationId });
  
  socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ_RESPONSE, {
    conversationId,
    userId,
    lastReadAt: now,
  });

  logger.debug(`User ${userId} joined conversation ${conversationId}`);
};

export const handleConversationLeave = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, conversationIdSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      error: 'invalid_payload',
      details: validated.error,
    });
    return;
  }

  const { conversationId } = validated.data as ConversationIdPayload;

  const now = new Date();
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: now },
  });

  socket.leave(`conversation:${conversationId}`);
  socket.emit(SOCKET_EVENTS.CONVERSATION_LEFT, { conversationId });

  socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ_RESPONSE, {
    conversationId,
    userId,
    lastReadAt: now,
  });

  logger.debug(`User ${userId} left conversation ${conversationId}`);
};

export const handleConversationClear = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, conversationIdSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      error: 'invalid_payload',
      details: validated.error,
    });
    return;
  }

  const { conversationId } = validated.data as ConversationIdPayload;

  if (!(await isConversationParticipant(conversationId, userId))) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not a participant' });
    return;
  }

  await prisma.conversationSettings.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { clearedAt: new Date() },
  });

  socket.emit(SOCKET_EVENTS.CONVERSATION_CLEARED, { conversationId });
  logger.debug(`User ${userId} cleared conversation ${conversationId}`);
};

export const handleConversationDelete = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, conversationIdSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      error: 'invalid_payload',
      details: validated.error,
    });
    return;
  }

  const { conversationId } = validated.data as ConversationIdPayload;

  if (!(await isConversationParticipant(conversationId, userId))) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not a participant' });
    return;
  }

  await prisma.conversationSettings.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { deletedAt: new Date() },
  });

  socket.leave(`conversation:${conversationId}`);
  socket.emit(SOCKET_EVENTS.CONVERSATION_DELETED, { conversationId });
  logger.debug(`User ${userId} deleted conversation ${conversationId}`);
};
