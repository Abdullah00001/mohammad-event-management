import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import { Namespace } from 'socket.io';
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
import { getPushNotificationQueue } from '@/app/queues/queues';
import { EPushNotificationJobName } from '@/app/@types/queue.types';
import logger from '@/app/configs/logger.configs';

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
    });
  } catch (error) {
    logger.error('Failed to save message:', error);
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { tempId, error: 'server_error' });
    return;
  }

  // 5. Broadcast to all other participants in the room
  const roomName = `conversation:${conversationId}`;
  socket.nsp.to(roomName).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
    id: message.id,
    senderId: userId,
    content: message.content,
    attachments: message.attachments,
    createdAt: message.createdAt,
    tempId,
  });

  // 6. Confirm to sender
  socket.emit(SOCKET_EVENTS.MESSAGE_CONFIRMED, {
    tempId,
    id: message.id,
    createdAt: message.createdAt,
  });

  // 7. Update conversation's updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // 8. Notify offline participants (via push notifications & in-app)
  const otherParticipants = await getOtherParticipants(conversationId, userId);
  if (otherParticipants.length > 0) {
    const pushQueue = getPushNotificationQueue();
    for (const participant of otherParticipants) {
      // Create in‑app notification
      await prisma.notification.create({
        data: {
          userId: participant.userId,
          notificationTitle: 'New message',
          notificationDescription: `${participant.name || 'Someone'}: ${content.slice(0, 50)}${content.length > 50 ? '…' : ''}`,
          type: 'CHAT_MESSAGE',
          metadata: {
            conversationId,
            senderId: userId,
            messageId: message.id,
          },
        },
      });

      // Enqueue push notification job
      if (participant.fcmTokens && participant.fcmTokens.length > 0) {
        await pushQueue.add(EPushNotificationJobName.SEND_MULTICAST, {
          jobName: EPushNotificationJobName.SEND_MULTICAST,
          tokens: participant.fcmTokens,
          payload: {
            title: 'New message',
            body: `${participant.name || 'Someone'}: ${content.slice(0, 50)}${content.length > 50 ? '…' : ''}`,
            data: {
              type: 'CHAT_MESSAGE',
              conversationId,
              messageId: message.id,
            },
          },
          traceId: `chat-${conversationId}-${Date.now()}`,
        });
      }
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

  // Update clearedAt to mark all previous messages as read.
  await prisma.conversationSettings.update({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    data: {
      clearedAt: new Date(),
    },
  });

  // Notify others in the room
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
