import { TEventHandler } from '@/app/sockets/types/helper.types';
import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import {
  TEventChatMessagePayload,
  eventChatMessageSchema,
} from '@/app/sockets/schemas/chat.schema';
import { validateSocketPayload } from '@/app/utils/system.utils';

export const sendMessageOnEventChatHandler: TEventHandler<
  TEventChatMessagePayload
> = async (socket: AuthenticatedSocket, data: TEventChatMessagePayload) => {
  const payload = validateSocketPayload(data, eventChatMessageSchema);
  if (!payload.data && payload.error) {
    socket.emit('error', {
      success: false,
      message: 'Event message validation failed',
      error: payload.error,
    });
    return;
  }
  const { content, eventId, attachments } =
    payload.data as TEventChatMessagePayload;

  
};
