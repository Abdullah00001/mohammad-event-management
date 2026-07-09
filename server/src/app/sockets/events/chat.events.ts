import { IEventRegistration } from '@/app/sockets/types/helper.types';
import { SOCKET_EVENTS } from '@/const';
import { sendMessageOnEventChatHandler } from '@/app/sockets/handlers/chat/eventChat.handlers';

export const chatEventRegistry: IEventRegistration[] = [
  {
    eventName: SOCKET_EVENTS.SEND_MESSAGE_ON_EVENT_CHAT,
    handler: sendMessageOnEventChatHandler,
  },
];
