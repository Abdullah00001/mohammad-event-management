import { ConversationType, EventStatus, User, FriendshipStatus } from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@/const';
import { TGetConversationQuery } from '@/app/modules/conversations/conversations.schemas';

// ─────────────────────────────────────────────────────────────────────────────
//  GET CONVERSATIONS LIST
// ─────────────────────────────────────────────────────────────────────────────

export const getConversationsService = async ({
  user,
  query,
  conversationId,
}: {
  user: User;
  query: TGetConversationQuery;
  conversationId?: string;
}) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = query;
    const offset = (page - 1) * limit;

    // ── 1. Collect blocked user IDs (both directions) ─────────────
    //
    // Exclude conversations where the other participant has blocked
    // the calling user OR the calling user has blocked them.
    //
    const [blockedByMe, blockedMe, friendships] = await Promise.all([
      prisma.blockList.findMany({
        where: { blockerId: user.id },
        select: { blockedUserId: true },
      }),
      prisma.blockList.findMany({
        where: { blockedUserId: user.id },
        select: { blockerId: true },
      }),
      prisma.friends.findMany({
        where: {
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
      }),
    ]);

    const blockedByMeSet = new Set(blockedByMe.map((r) => r.blockedUserId));
    const blockedMeSet = new Set(blockedMe.map((r) => r.blockerId));

    const blockedIds = new Set([
      ...blockedByMeSet,
      ...blockedMeSet,
    ]);

    const friendSet = new Set<string>();
    const pendingSentSet = new Set<string>();
    const pendingReceivedSet = new Set<string>();
    for (const f of friendships) {
      const otherId = f.senderId === user.id ? f.receiverId : f.senderId;
      if (f.status === FriendshipStatus.ACCEPTED) {
        friendSet.add(otherId);
      } else if (f.status === FriendshipStatus.PENDING) {
        if (f.senderId === user.id) {
          pendingSentSet.add(otherId);
        } else {
          pendingReceivedSet.add(otherId);
        }
      }
    }

    // ── 2. Fetch paginated conversations + total count ────────────
    const [rawConversations, totalCount] = await prisma.$transaction([
      prisma.conversation.findMany({
        where: {
          deletedAt: null,
          ...(conversationId && { id: conversationId }),

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
                eventStatus: { in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
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
              startDate: true,
              endDate: true,
              eventTypes: {
                select: {
                  eventType: true,
                },
              },
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
          ...(conversationId && { id: conversationId }),
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
              event: { eventStatus: { in: [EventStatus.UPCOMING, EventStatus.ONGOING] } },
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

    // Fetch caller's lastReadAt and calculate unread counts
    const participantRecords = await prisma.conversationParticipant.findMany({
      where: { 
        userId: user.id, 
        conversationId: { in: rawConversations.map(c => c.id) } 
      },
      select: { conversationId: true, lastReadAt: true }
    });

    const unreadCountsMap = new Map<string, number>();
    await Promise.all(
      participantRecords.map(async (p) => {
        const count = await prisma.message.count({
          where: {
            conversationId: p.conversationId,
            createdAt: { gt: p.lastReadAt }
          }
        });
        unreadCountsMap.set(p.conversationId, count);
      })
    );

    // ── 3. Shape response ─────────────────────────────────────────
    const conversations = rawConversations.map((conv) => {
      let otherParticipant = null;

      if (conv.type === ConversationType.PRIVATE) {
        const participantUser = conv.participants[0]?.user ?? null;
        if (participantUser) {
          let connectionStatus: 'ADD_ORCA' | 'PENDING' | 'ACCEPT' | 'FRIEND' | 'BLOCKED_BY_ME' | 'BLOCKED_ME' = 'ADD_ORCA';
          if (blockedByMeSet.has(participantUser.id)) {
            connectionStatus = 'BLOCKED_BY_ME';
          } else if (blockedMeSet.has(participantUser.id)) {
            connectionStatus = 'BLOCKED_ME';
          } else if (friendSet.has(participantUser.id)) {
            connectionStatus = 'FRIEND';
          } else if (pendingSentSet.has(participantUser.id)) {
            connectionStatus = 'PENDING';
          } else if (pendingReceivedSet.has(participantUser.id)) {
            connectionStatus = 'ACCEPT';
          }
          otherParticipant = {
            ...participantUser,
            connectionStatus,
          };
        }
      }

      // Format eventType correctly for GROUP events
      let formattedEvent = null;
      if (conv.type === ConversationType.GROUP && conv.event) {
        // @ts-ignore - eventTypes is implicitly fetched
        const eventTypeObj = conv.event.eventTypes?.[0]?.eventType ?? null;
        formattedEvent = {
          id: conv.event.id,
          eventName: conv.event.eventName,
          eventStatus: conv.event.eventStatus,
          startDate: conv.event.startDate,
          endDate: conv.event.endDate,
          eventType: eventTypeObj,
        };
      }

      const myParticipantRecord = participantRecords.find((p) => p.conversationId === conv.id);

      return {
        id: conv.id,
        type: conv.type,
        updatedAt: conv.updatedAt,
        unreadCount: unreadCountsMap.get(conv.id) || 0,
        lastReadAt: myParticipantRecord?.lastReadAt ?? null,
        otherParticipant,
        event: formattedEvent,
        lastMessage: conv.messages[0] ?? null,
      };
    });

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
  query,
}: {
  user: User;
  id: string;
  query: TGetConversationQuery;
}) => {
  try {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = query;
    const offset = (page - 1) * limit;
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
            lastReadAt: true,
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
            startDate: true,
            endDate: true,
            eventTypes: {
              select: {
                eventType: true,
              },
            },
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

    const [messages, totalMessages, blockedByMe, blockedMe, friendships] = await Promise.all([
      prisma.message.findMany({
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
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.message.count({ where: messagesWhere }),
      prisma.blockList.findMany({
        where: { blockerId: user.id },
        select: { blockedUserId: true },
      }),
      prisma.blockList.findMany({
        where: { blockedUserId: user.id },
        select: { blockerId: true },
      }),
      prisma.friends.findMany({
        where: {
          OR: [{ senderId: user.id }, { receiverId: user.id }],
        },
      }),
    ]);

    // ── 4. Shape response ─────────────────────────────────────────
    const blockedByMeSet = new Set(blockedByMe.map((r) => r.blockedUserId));
    const blockedMeSet = new Set(blockedMe.map((r) => r.blockerId));

    const friendSet = new Set<string>();
    const pendingSentSet = new Set<string>();
    const pendingReceivedSet = new Set<string>();
    for (const f of friendships) {
      const otherId = f.senderId === user.id ? f.receiverId : f.senderId;
      if (f.status === FriendshipStatus.ACCEPTED) {
        friendSet.add(otherId);
      } else if (f.status === FriendshipStatus.PENDING) {
        if (f.senderId === user.id) pendingSentSet.add(otherId);
        else pendingReceivedSet.add(otherId);
      }
    }
    const otherParticipants = conversation.participants
      .filter((p) => p.user.id !== user.id)
      .map((p) => {
        let connectionStatus: 'ADD_ORCA' | 'PENDING' | 'ACCEPT' | 'FRIEND' | 'BLOCKED_BY_ME' | 'BLOCKED_ME' = 'ADD_ORCA';
        if (blockedByMeSet.has(p.user.id)) {
          connectionStatus = 'BLOCKED_BY_ME';
        } else if (blockedMeSet.has(p.user.id)) {
          connectionStatus = 'BLOCKED_ME';
        } else if (friendSet.has(p.user.id)) {
          connectionStatus = 'FRIEND';
        } else if (pendingSentSet.has(p.user.id)) {
          connectionStatus = 'PENDING';
        } else if (pendingReceivedSet.has(p.user.id)) {
          connectionStatus = 'ACCEPT';
        }
        return {
          ...p.user,
          connectionStatus,
        };
      });

    // Determine otherParticipant logic
    const resolvedOtherParticipant = conversation.type === ConversationType.GROUP ? null : (otherParticipants[0] ?? null);

    // Format eventType correctly for GROUP events
    let formattedEvent = null;
    if (conversation.type === ConversationType.GROUP && conversation.event) {
      // @ts-ignore
      const eventTypeObj = conversation.event.eventTypes?.[0]?.eventType ?? null;
      formattedEvent = {
        id: conversation.event.id,
        eventName: conversation.event.eventName,
        eventStatus: conversation.event.eventStatus,
        startDate: conversation.event.startDate,
        endDate: conversation.event.endDate,
        eventType: eventTypeObj,
      };
    }

    const totalPages = Math.ceil(totalMessages / limit);

    const myParticipant = conversation.participants.find(p => p.user.id === user.id);

    return {
      data: {
        id: conversation.id,
        type: conversation.type,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastReadAt: myParticipant?.lastReadAt ?? null,
        event: formattedEvent,
        otherParticipant: resolvedOtherParticipant,
        messages,
      },
      meta: {
        totalMessages,
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
