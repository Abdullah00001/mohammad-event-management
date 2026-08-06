import { z } from 'zod';
import { FriendshipStatus } from '@prisma/client';
import { BLOCK_STATUS } from '@/app/modules/connection/connection.types';

export const manageMyConnectionRequestSchema = z.object({
  requestId: z.uuid({ message: 'requestId must be a valid UUID' }),
  requestStatus: z.enum(
    [FriendshipStatus.ACCEPTED, FriendshipStatus.REJECTED],
    {
      // Change errorMap to message
      message: `requestStatus must be either ${FriendshipStatus.ACCEPTED} or ${FriendshipStatus.REJECTED}`,
    }
  ),
});

export type ManageMyConnectionRequestInput = z.infer<
  typeof manageMyConnectionRequestSchema
>;

export const blockOneConnectionSchema = z.object({
  blockStatus: z.enum([BLOCK_STATUS.BLOCKED, BLOCK_STATUS.UNBLOCKED], {
    error: `blockStatus must be either ${BLOCK_STATUS.BLOCKED} or ${BLOCK_STATUS.UNBLOCKED}`,
  }),
});

export type BlockOneConnectionInput = z.infer<typeof blockOneConnectionSchema>;

export const sendFriendRequestSchema = z
  .object({
    receiverId: z.uuid({ message: 'receiverId must be a valid UUID' }),
    requestStatus: z.enum([FriendshipStatus.PENDING], {
      message: `requestStatus must be ${FriendshipStatus.PENDING}`,
    }),
  })
  .strict();

export type TSendFriendRequestPayload = z.infer<typeof sendFriendRequestSchema>;
