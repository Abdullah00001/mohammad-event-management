import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import { SOCKET_EVENTS } from '@/const';

export const handleTypingStart = async (
  socket: AuthenticatedSocket,
  data: { conversationId: string }
) => {
  const userId = socket.user?.id;
  socket
    .to(`conv:${data.conversationId}`)
    .emit(SOCKET_EVENTS.TYPING_START_RESPONSE, {
      userId,
      conversationId: data.conversationId,
    });
};

export const handleTypingStop = async (
  socket: AuthenticatedSocket,
  data: { conversationId: string }
) => {
  const userId = socket.user?.id;
  socket
    .to(`conv:${data.conversationId}`)
    .emit(SOCKET_EVENTS.TYPING_STOP_RESPONSE, {
      userId,
      conversationId: data.conversationId,
    });
};
