import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';
import { isBlocked } from '@/app/sockets/helpers/block.utils';
import { pushNotificationQueue } from '@/app/queues/push.queue';
import logger from '@/app/configs/logger.configs';

interface SendPrivateMessagePayload {
  conversationId: string;
  content: string;
  tempId: string;
}

export const handlePrivateMessageSend = async (
  socket: AuthenticatedSocket,
  data: SendPrivateMessagePayload
) => {
  const userId = socket.user?.id;
  if (!userId) {
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Unauthorized' });
    return;
  }

  const { conversationId, content, tempId } = data;

  try {
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    if (!conv) {
      socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, {
        tempId,
        error: 'conversation_not_found',
      });
      return;
    }

    const otherUserId = conv.userAId === userId ? conv.userBId : conv.userAId;

    if (await isBlocked(userId, otherUserId)) {
      socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { tempId, error: 'blocked' });
      return;
    }

    const message = await prisma.message.create({
      data: { conversationId, senderId: userId, content },
    });

    // Broadcast to others in room
    socket.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
      id: message.id,
      senderId: userId,
      content: message.content,
      createdAt: message.createdAt,
      tempId,
    });

    // Confirm to sender
    socket.emit(SOCKET_EVENTS.MESSAGE_CONFIRMED, {
      tempId,
      id: message.id,
      createdAt: message.createdAt,
    });

    // Push notification if offline
    const roomSockets = await socket.nsp
      .in(`conv:${conversationId}`)
      .fetchSockets();
    const otherOnline = roomSockets.some(
      (s) => (s as AuthenticatedSocket).user?.id === otherUserId
    );
    if (!otherOnline) {
      const senderName =
        conv.userAId === userId
          ? conv.userA.profile?.name
          : conv.userB.profile?.name;
      await pushNotificationQueue.add('send-push', {
        userId: otherUserId,
        title: 'New message',
        body: `${senderName || 'User'}: ${content}`,
        metadata: { conversationId, type: 'PRIVATE_MESSAGE' },
      });
    }
  } catch (error) {
    logger.error('Private message error:', error);
    socket.emit(SOCKET_EVENTS.MESSAGE_ERROR, { tempId, error: 'server_error' });
  }
};
