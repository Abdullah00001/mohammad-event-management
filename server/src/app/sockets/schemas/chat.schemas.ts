import { z } from 'zod';

export const conversationIdSchema = z.object({
  conversationId: z.uuid(),
});

export const messageIdSchema = z.object({
  messageId: z.uuid(),
});

export const sendMessageSchema = z.object({
  conversationId: z.uuid(),
  content: z.string().min(1).max(2000),
  attachments: z.array(z.url()).default([]),
  tempId: z.string().min(1),
});

export const readMessageSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid().optional(),
});

export const typingSchema = z.object({
  conversationId: z.uuid(),
});

export const eventJoinSchema = z.object({
  eventId: z.uuid(),
});

export type ConversationIdPayload = z.infer<typeof conversationIdSchema>;
export type SendMessagePayload = z.infer<typeof sendMessageSchema>;
export type ReadMessagePayload = z.infer<typeof readMessageSchema>;
export type TypingPayload = z.infer<typeof typingSchema>;
export type EventJoinPayload = z.infer<typeof eventJoinSchema>;
