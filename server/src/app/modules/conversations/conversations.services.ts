import { ConversationType, EventStatus, User } from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@/const';
import { TGetConversationQuery } from '@/app/modules/conversations/conversations.schemas';

// ─────────────────────────────────────────────────────────────────────────────
//  GET CONVERSATIONS LIST
// ─────────────────────────────────────────────────────────────────────────────

export const getConversationsService = async ({
  user,
  query,
}: {
  user: User;
  query: TGetConversationQuery;
}) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = query;
    const offset = (page - 1) * limit;

    // ── 1. Collect blocked user IDs (both directions) ─────────────
    //
    // Exclude conversations where the other participant has blocked
    // the calling user OR the calling user has blocked them.
    //
    const [blockedByMe, blockedMe] = await Promise.all([
      prisma.blockList.findMany({
        where: { blockerId: user.id },
        select: { blockedUserId: true },
      }),
      prisma.blockList.findMany({
        where: { blockedUserId: user.id },
        select: { blockerId: true },
      }),
    ]);

    const blockedIds = new Set([
      ...blockedByMe.map((r) => r.blockedUserId),
      ...blockedMe.map((r) => r.blockerId),
    ]);

    // ── 2. Fetch paginated conversations + total count ────────────
    const [rawConversations, totalCount] = await prisma.$transaction([
      prisma.conversation.findMany({
        where: {
          deletedAt: null,

          // User must be a participant
          participants: {
            some: { userId: user.id },
          },

          // Exclude conversations this user has soft-deleted
          settings: {
            none: {
              userId: user.id,
              deletedAt: { not: null },
            },
          },

          // For GROUP conversations — exclude deleted events
          OR: [
            {
              type: ConversationType.PRIVATE,
            },
            {
              type: ConversationType.GROUP,
              event: {
                eventStatus: { not: EventStatus.DELETED },
              },
            },
          ],

          // FIXED: Exclude PRIVATE conversations where the other
          // participant is blocked (either direction).
          // GROUP conversations are unaffected — same as Messenger.
          AND:
            blockedIds.size > 0
              ? [
                  {
                    OR: [
                      {
                        type: ConversationType.GROUP,
                      },
                      {
                        type: ConversationType.PRIVATE,
                        participants: {
                          none: {
                            userId: { in: Array.from(blockedIds) },
                          },
                        },
                      },
                    ],
                  },
                ]
              : [],
        },
        select: {
          id: true,
          type: true,
          updatedAt: true,

          // For GROUP: event info
          event: {
            select: {
              id: true,
              eventName: true,
              eventStatus: true,
            },
          },

          // Last message preview
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              sender: {
                select: {
                  id: true,
                  profile: { select: { name: true, avatar: true } },
                },
              },
            },
          },

          // Other participants (exclude calling user)
          participants: {
            where: { userId: { not: user.id } },
            select: {
              user: {
                select: {
                  id: true,
                  profile: { select: { name: true, avatar: true } },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit,
      }),

      prisma.conversation.count({
        where: {
          deletedAt: null,
          participants: { some: { userId: user.id } },
          settings: {
            none: {
              userId: user.id,
              deletedAt: { not: null },
            },
          },
          OR: [
            { type: ConversationType.PRIVATE },
            {
              type: ConversationType.GROUP,
              event: { eventStatus: { not: EventStatus.DELETED } },
            },
          ],
          AND:
            blockedIds.size > 0
              ? [
                  {
                    OR: [
                      {
                        type: ConversationType.GROUP,
                      },
                      {
                        type: ConversationType.PRIVATE,
                        participants: {
                          none: {
                            userId: { in: Array.from(blockedIds) },
                          },
                        },
                      },
                    ],
                  },
                ]
              : [],
        },
      }),
    ]);

    // ── 3. Shape response ─────────────────────────────────────────
    const conversations = rawConversations.map((conv) => ({
      id: conv.id,
      type: conv.type,
      updatedAt: conv.updatedAt,

      // For PRIVATE: the other user's profile
      // For GROUP: null (use event info instead)
      otherParticipant:
        conv.type === ConversationType.PRIVATE
          ? (conv.participants[0]?.user ?? null)
          : null,

      // For GROUP: event info
      event: conv.type === ConversationType.GROUP ? (conv.event ?? null) : null,

      // Last message preview
      lastMessage: conv.messages[0] ?? null,
    }));

    // ── 4. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: conversations,
      meta: {
        totalConversations: totalCount,
        totalPages,
        links: {
          currentPage: page,
          nextPage: page < totalPages ? page + 1 : null,
          previousPage: page > 1 ? page - 1 : null,
          firstPage: 1,
          lastPage: totalPages || 1,
        },
      },
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getConversationsService');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET SINGLE CONVERSATION WITH MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export const getSingleConversationService = async ({
  user,
  id,
}: {
  user: User;
  id: string;
}) => {
  try {
    // ── 1. Fetch conversation + caller's settings ─────────────────
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        type: true,
        createdAt: true,
        updatedAt: true,

        // Verify user is a participant
        participants: {
          select: {
            user: {
              select: {
                id: true,
                profile: { select: { name: true, avatar: true } },
              },
            },
          },
        },

        // Caller's settings — for clearedAt
        settings: {
          where: { userId: user.id },
          select: { clearedAt: true, deletedAt: true },
        },

        // For GROUP: event info
        event: {
          select: {
            id: true,
            eventName: true,
            eventStatus: true,
          },
        },
      },
    });

    // ── 2. Guard: user must be a participant ──────────────────────
    const isParticipant = conversation.participants.some(
      (p) => p.user.id === user.id
    );
    if (!isParticipant) throw new Error('Conversation not found');

    const callerSettings = conversation.settings[0] ?? null;

    // Guard: conversation soft-deleted for this user
    if (callerSettings?.deletedAt) throw new Error('Conversation not found');

    // ── 3. Fetch paginated messages ───────────────────────────────
    //
    // Respect clearedAt — hide messages before this date for caller
    //
    const messagesWhere = {
      conversationId: id,
      deletedAt: null,
      ...(callerSettings?.clearedAt && {
        createdAt: { gt: callerSettings.clearedAt },
      }),
    };

    const messages = await prisma.message.findMany({
      where: messagesWhere,
      select: {
        id: true,
        content: true,
        attachments: true,
        isEdited: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            profile: { select: { name: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // ── 4. Shape response ─────────────────────────────────────────
    const otherParticipants = conversation.participants
      .filter((p) => p.user.id !== user.id)
      .map((p) => p.user);

    return {
      id: conversation.id,
      type: conversation.type,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      event:
        conversation.type === ConversationType.GROUP
          ? (conversation.event ?? null)
          : null,
      otherParticipants,
      messages,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in getSingleConversationService');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE (SOFT) CONVERSATION FOR CALLING USER
// ─────────────────────────────────────────────────────────────────────────────

export const deleteSingleConversationService = async ({
  user,
  id,
}: {
  user: User;
  id: string;
}) => {
  try {
    // ── 1. Verify user is a participant ───────────────────────────
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!participant) throw new Error('Conversation not found');

    // ── 2. Upsert ConversationSettings with deletedAt ─────────────
    //
    // Soft delete for this user only — other participants unaffected
    //
    await prisma.conversationSettings.upsert({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.id,
        },
      },
      update: { deletedAt: new Date() },
      create: {
        conversationId: id,
        userId: user.id,
        deletedAt: new Date(),
      },
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in deleteSingleConversationService'
    );
  }
};
