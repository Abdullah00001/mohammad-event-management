// server/src/app/sockets/handlers/chat/privateChat.handlers.ts
import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';
import { validateSocketPayload } from '@/app/utils/system.utils';
import {
  sendMessageSchema,
  readMessageSchema,
  typingSchema,
  SendMessagePayload,
  ReadMessagePayload,
  TypingPayload,
} from '@/app/sockets/schemas/chat.schemas';
import {
  isConversationParticipant,
  getConversation,
  getOtherParticipants,
  isBlocked,
} from '@/app/sockets/helpers/chat.helpers';
import { getSystemQueue } from '@/app/queues/queues';
import logger from '@/app/configs/logger.configs';
import { getConversationsService } from '@/app/modules/conversations/conversations.services';

// ─── Send Message (Unified for Private & Event) ──────────────────
export const handleSendMessage = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, sendMessageSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      tempId: (data as any)?.tempId,
      error: 'invalid_payload',
      details: validated.error,
    });
    return;
  }

  const { conversationId, content, attachments, tempId } =
    validated.data as SendMessagePayload;

  // 1. Verify user is a participant
  if (!(await isConversationParticipant(conversationId, userId))) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      tempId,
      error: 'not_participant',
    });
    return;
  }

  // 2. Get conversation details
  const conversation = await getConversation(conversationId);
  if (!conversation) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
      tempId,
      error: 'conversation_not_found',
    });
    return;
  }

  // 3. For private conversations, check if blocked
  if (conversation.type === 'PRIVATE') {
    const otherParticipants = await getOtherParticipants(
      conversationId,
      userId
    );
    if (otherParticipants.length > 0) {
      const otherUserId = otherParticipants[0].userId;
      if (await isBlocked(userId, otherUserId)) {
        socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { tempId, error: 'blocked' });
        return;
      }
    }
  }

  // 4. Save message
  let message;
  try {
    message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        attachments,
      },
      select: {
        id: true,
        content: true,
        attachments: true,
        isEdited: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            profile: {
              select: {
                name: true,
                avatar: true,
              }
            }
          }
        }
      }
    });
  } catch (error) {
    logger.error('Failed to save message:', error);
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { tempId, error: 'server_error' });
    return;
  }

  // 5. Broadcast to all other participants in the room
  const roomName = `conversation:${conversationId}`;
  socket.nsp.to(roomName).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
    ...message,
    tempId,
  });

  // 6. Confirm to sender
  socket.emit(SOCKET_EVENTS.MESSAGE_CONFIRMED, {
    ...message,
    tempId,
  });

  // 7. Update conversation's updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // 8. Notify other participants (in-app + push via system queue)
  const otherParticipants = await getOtherParticipants(conversationId, userId);
  const senderUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  const senderName = senderUser?.profile?.name || 'User';
  const targetUserIds = otherParticipants.map(p => p.userId);

  if (targetUserIds.length > 0) {
    const systemQueue = getSystemQueue();
    await systemQueue.add('notify-chat-message', {
      targetUserIds,
      senderName,
      conversationId,
      messageContent: content.slice(0, 50) + (content.length > 50 ? '…' : ''),
      traceId: socket.traceId || 'NO_TRACE_ID',
    });

  }

  // Broadcast CONVERSATION_LIST_UPDATE to ALL participants (sender + receivers) 
  // with the fully populated conversation list object.
  const allParticipantIds = [userId, ...targetUserIds];
  for (const pId of allParticipantIds) {
    try {
      const pUser = await prisma.user.findUnique({ where: { id: pId }});
      if (pUser) {
        // Fetch the conversation exactly formatted as the list API
        const listRes = await getConversationsService({ 
          user: pUser, 
          query: { limit: 1, page: 1 }, 
          conversationId 
        });
        
        if (listRes.data && listRes.data.length > 0) {
          socket.nsp.to(`user_${pId}`).emit(SOCKET_EVENTS.CONVERSATION_LIST_UPDATE, listRes.data);
        }
      }
    } catch (err) {
      logger.error(`Failed to broadcast conversation update for user ${pId}:`, err);
    }
  }

  logger.debug(`Message ${message.id} sent in conversation ${conversationId}`);
};

// ─── Mark Message as Read ──────────────────────────────────────────
export const handleMessageRead = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const validated = validateSocketPayload(data, readMessageSchema);
  if (!validated.data) {
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { error: 'invalid_payload' });
    return;
  }

  const { conversationId, messageId } = validated.data as ReadMessagePayload;

  // Update lastReadAt on ConversationParticipant (for unread counts)
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    data: {
      lastReadAt: new Date(),
    },
  });

  socket
    .to(`conversation:${conversationId}`)
    .emit(SOCKET_EVENTS.MESSAGE_READ_RESPONSE, {
      conversationId,
      messageId: messageId || null,
      readBy: userId,
      readAt: new Date(),
    });
};

// ─── Typing Handlers ───────────────────────────────────────────────
export const handleTypingStart = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) return;

  const validated = validateSocketPayload(data, typingSchema);
  if (!validated.data) return;

  const { conversationId } = validated.data as TypingPayload;
  socket
    .to(`conversation:${conversationId}`)
    .emit(SOCKET_EVENTS.TYPING_START_RESPONSE, {
      userId,
      conversationId,
    });
};

export const handleTypingStop = async (
  socket: AuthenticatedSocket,
  data: unknown
) => {
  const userId = socket.user?.id;
  if (!userId) return;

  const validated = validateSocketPayload(data, typingSchema);
  if (!validated.data) return;

  const { conversationId } = validated.data as TypingPayload;
  socket
    .to(`conversation:${conversationId}`)
    .emit(SOCKET_EVENTS.TYPING_STOP_RESPONSE, {
      userId,
      conversationId,
    });
};
