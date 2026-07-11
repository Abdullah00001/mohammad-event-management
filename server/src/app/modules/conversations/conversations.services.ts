import { User } from '@prisma/client';

import {
  TGetConversationQuery,
} from '@/app/modules/conversations/conversations.schemas';

export const getConversationsService = async ({
  user,
  query,
}: {
  user: User;
  query: TGetConversationQuery;
}) => {
  try {
    // Implement the logic to retrieve conversations for the user
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getConversationsService');
  }
};

export const getSingleConversationService = async ({
  user,
  id,
}: {
  user: User;
  id: string;
}) => {
  try {
    // Implement the logic to retrieve a single conversation for the user
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getSingleConversationService');
  }
};

export const deleteSingleConversationService = async ({
  user,
  id,
}: {
  user: User;
  id: string;
}) => {
  try {
    // Implement the logic to delete a single conversation for the user
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in deleteSingleConversationService'
    );
  }
};
