import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import { SOCKET_EVENTS } from '@/const';

export const handleConversationJoin = async (
  socket: AuthenticatedSocket,
  data: { conversationId: string }
) => {
  const userId = socket.user?.id;
  const { conversationId } = data;

  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
  });

  if (!conv) {
    socket.emit(SOCKET_EVENTS.ERROR, {
      message: 'Conversation not found or unauthorized',
    });
    return;
  }

  socket.join(`conv:${conversationId}`);
  socket.emit(SOCKET_EVENTS.CONVERSATION_JOINED, { conversationId });
};

export const handleConversationLeave = async (
  socket: AuthenticatedSocket,
  data: { conversationId: string }
) => {
  const { conversationId } = data;
  socket.leave(`conv:${conversationId}`);
  socket.emit(SOCKET_EVENTS.CONVERSATION_LEFT, { conversationId });
};
