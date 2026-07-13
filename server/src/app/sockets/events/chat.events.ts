import { IEventRegistration } from '@/app/sockets/types/helper.types';
import { SOCKET_EVENTS } from '@/const';
import {
  handleConversationJoin,
  handleConversationLeave,
  handleConversationClear,
  handleConversationDelete,
} from '@/app/sockets/handlers/chat/conversation.handler';
import {
  handleEventJoin,
  handleEventLeave,
} from '@/app/sockets/handlers/chat/eventChat.handlers';
import {
  handleSendMessage,
  handleMessageRead,
  handleTypingStart,
  handleTypingStop,
} from '@/app/sockets/handlers/chat/privateChat.handlers';

export const chatEventRegistry: IEventRegistration[] = [
  // ── Conversation Management ──
  {
    eventName: SOCKET_EVENTS.CONVERSATION_JOIN,
    handler: handleConversationJoin,
  },
  {
    eventName: SOCKET_EVENTS.CONVERSATION_LEAVE,
    handler: handleConversationLeave,
  },
  {
    eventName: SOCKET_EVENTS.CONVERSATION_CLEAR,
    handler: handleConversationClear,
  },
  {
    eventName: SOCKET_EVENTS.CONVERSATION_DELETE,
    handler: handleConversationDelete,
  },

  // ── Event Group Chat ──
  { eventName: SOCKET_EVENTS.EVENT_JOIN, handler: handleEventJoin },
  { eventName: SOCKET_EVENTS.EVENT_LEAVE, handler: handleEventLeave },

  // ── Messaging (Unified: private + event) ──
  { eventName: SOCKET_EVENTS.MESSAGE_SEND, handler: handleSendMessage },
  { eventName: SOCKET_EVENTS.MESSAGE_SEND_EVENT, handler: handleSendMessage },
  { eventName: SOCKET_EVENTS.MESSAGE_READ, handler: handleMessageRead },

  // ── Typing ──
  { eventName: SOCKET_EVENTS.TYPING_START, handler: handleTypingStart },
  { eventName: SOCKET_EVENTS.TYPING_STOP, handler: handleTypingStop },
];
