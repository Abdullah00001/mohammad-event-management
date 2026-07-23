import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@/const';
import {
  ConversationType,
  EventStatus,
  FriendshipStatus,
  User,
} from '@prisma/client';
import { userHasFeatureService } from '@/app/modules/subscription/subscription.services';
import prisma from '@/app/configs/db.configs';
import {
  BLOCK_STATUS,
  TGeMyConnectionRequests,
} from '@/app/modules/connection/connection.types';
import { TSendFriendRequestPayload } from '@/app/modules/connection/connection.schemas';
import { getSystemQueue } from '@/app/queues/queues';
import { getTraceId } from '@/app/configs/requestContext.configs';

export const getMyConnectionService = async ({
  user,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
}: {
  user: User;
  page: number | undefined;
  limit: number | undefined;
  search: string | undefined;
}): Promise<unknown> => {
  try {
    const offset = (page - 1) * limit;

    // ── 0. Fetch blocked IDs ──────────────────────────────────────
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

    const blockedIds = [
      ...blockedByMe.map((b) => b.blockedUserId),
      ...blockedMe.map((b) => b.blockerId),
    ];

    // ── 1. Shared where clause ────────────────────────────────────
    const sharedWhere = {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        {
          senderId: user.id,
          receiverId: { notIn: blockedIds },
          receiver: search
            ? {
                profile: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              }
            : undefined,
        },
        {
          receiverId: user.id,
          senderId: { notIn: blockedIds },
          sender: search
            ? {
                profile: {
                  name: { contains: search, mode: 'insensitive' as const },
                },
              }
            : undefined,
        },
      ],
    };

    // ── 2. Fetch friends + total count ────────────────────────────
    const [rawFriends, totalCount] = await prisma.$transaction([
      prisma.friends.findMany({
        where: sharedWhere,
        include: {
          sender: {
            select: {
              id: true,
              profile: {
                select: { name: true, avatar: true, bio: true },
              },
              // ADDED: check if I blocked the sender
              blockedBy: {
                where: { blockerId: user.id },
                select: { id: true },
              },
              // ADDED: check if sender blocked me
              blockedUsers: {
                where: { blockedUserId: user.id },
                select: { id: true },
              },
            },
          },
          receiver: {
            select: {
              id: true,
              profile: {
                select: { name: true, avatar: true, bio: true },
              },
              // ADDED: check if I blocked the receiver
              blockedBy: {
                where: { blockerId: user.id },
                select: { id: true },
              },
              // ADDED: check if receiver blocked me
              blockedUsers: {
                where: { blockedUserId: user.id },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),

      prisma.friends.count({
        where: sharedWhere,
      }),
    ]);

    // ── 3. Shape — resolve the "other" user + block flags ─────────
    const friends = await Promise.all(rawFriends.map(async (f) => {
      const friend = f.senderId === user.id ? f.receiver : f.sender;

      let connectionStatus:
        | 'ADD_ORCA'
        | 'FRIEND'
        | 'BLOCKED_BY_ME'
        | 'BLOCKED_ME' = 'FRIEND';
      if (friend.blockedBy.length > 0) {
        connectionStatus = 'BLOCKED_BY_ME';
      } else if (friend.blockedUsers.length > 0) {
        connectionStatus = 'BLOCKED_ME';
      }

      return {
        friendshipId: f.id,
        userId: friend.id,
        hasPassportStamp: await userHasFeatureService(friend.id, 'PASSPORT_STAMP'),
        name: friend.profile?.name ?? null,
        avatar: friend.profile?.avatar ?? null,
        bio: friend.profile?.bio ?? null,
        connectedAt: f.createdAt,
        connectionStatus,
      };
    }));

    // ── 4. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: friends,
      meta: {
        totalConnections: totalCount,
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
    throw new Error('Unknown error occurred in get get my connection service');
  }
};

export const getMySingleConnectionService = async ({
  id,
  user,
}: {
  id: string;
  user: User;
}) => {
  try {
    // ── 1. Fetch friend's user + profile ──────────────────────────
    const friend = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        isProfileSetup: true,
        profile: {
          select: {
            name: true,
            avatar: true,
            cover: true,
            bio: true,
            location: true,
            gender: true,
            age: true,
            profileInterest: true,
            countryVisited: true,
          },
        },
      },
    });

    // ── 2. Events joined count ────────────────────────────────────
    const eventsJoinedCount = await prisma.eventParticipants.count({
      where: {
        participantId: id,
        leftAt: null,
        event: {
          eventStatus: { not: EventStatus.DELETED },
        },
      },
    });

    // ── 3. Connections count ──────────────────────────────────────
    const connectionsCount = await prisma.friends.count({
      where: {
        OR: [
          { senderId: id, status: FriendshipStatus.ACCEPTED },
          { receiverId: id, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    // ── 4. FIXED: Resolve interest objects from profileInterest IDs
    //
    // Raw IDs replaced with full Interest objects — same pattern as
    // getSingleEventOrcaService and getProfileInformation
    //
    const interests = await prisma.interest.findMany({
      where: {
        id: { in: friend.profile?.profileInterest ?? [] },
        isDeleted: false,
      },
      select: {
        id: true,
        interestName: true,
        interestIcon: true,
      },
    });

    // ── 5. ADDED: Fetch existing PRIVATE conversation ─────────────
    //
    // Since this service is only reachable after
    // checkIsConnectionExistMiddleware confirms ACCEPTED friendship,
    // the PRIVATE conversation was created when the request was accepted.
    //
    const privateConversation = await prisma.conversation.findFirst({
      where: {
        type: ConversationType.PRIVATE,
        deletedAt: null,
        participants: {
          some: { userId: user.id },
        },
        AND: [
          {
            participants: {
              some: { userId: id },
            },
          },
        ],
      },
      select: { id: true },
    });

    const friendship = await prisma.friends.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: id },
          { senderId: id, receiverId: user.id },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
      select: { id: true },
    });

    // ── 6. Return friend profile ──────────────────────────────────

    return {
      id: friend.id,
      hasPassportStamp: await userHasFeatureService(friend.id, 'PASSPORT_STAMP'),
      isProfileSetup: friend.isProfileSetup,

      // Profile fields
      name: friend.profile?.name ?? null,
      avatar: friend.profile?.avatar ?? null,
      cover: friend.profile?.cover ?? null,
      bio: friend.profile?.bio ?? null,
      location: friend.profile?.location ?? null,
      gender: friend.profile?.gender ?? null,
      age: friend.profile?.age ?? null,
      // FIXED: resolved interest objects instead of raw IDs
      profileInterest: interests,
      countryVisited: friend.profile?.countryVisited ?? [],

      // Stats
      eventsJoinedCount,
      connectionsCount,

      // Always FRIEND — confirmed friend
      connectionStatus: 'FRIEND' as const,

      // ADDED: conversationId for the DM chat
      conversationId: privateConversation?.id ?? null,
      friendshipId: friendship?.id ?? null,
    };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in get get my single connection service'
    );
  }
};
export const getMyConnectionRequestsService = async ({
  user,
  limit = DEFAULT_LIMIT,
  page = DEFAULT_PAGE,
}: {
  user: User;
  page: number | undefined;
  limit: number | undefined;
}): Promise<TGeMyConnectionRequests> => {
  try {
    const offset = (page - 1) * limit;

    // ── 1. Fetch pending requests + total count ───────────────────
    //
    // Only requests where the logged-in user is the RECEIVER
    // and status is PENDING — these are the ones needing action
    //
    const [rawRequests, totalCount] = await prisma.$transaction([
      prisma.friends.findMany({
        where: {
          receiverId: user.id,
          status: FriendshipStatus.PENDING,
        },
        include: {
          sender: {
            select: {
              id: true,
              profile: {
                select: {
                  name: true,
                  avatar: true,
                  bio: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),

      prisma.friends.count({
        where: {
          receiverId: user.id,
          status: FriendshipStatus.PENDING,
        },
      }),
    ]);

    // ── 2. Shape each request ─────────────────────────────────────
    const requests = await Promise.all(rawRequests.map(async (f) => ({
      friendshipId: f.id,
      userId: f.sender.id,
      hasPassportStamp: await userHasFeatureService(f.sender.id, 'PASSPORT_STAMP'),
      name: f.sender.profile?.name ?? null,
      avatar: f.sender.profile?.avatar ?? null,
      bio: f.sender.profile?.bio ?? null,
      requestedAt: f.createdAt,
      connectionStatus: 'ACCEPT' as const,
    })));

    // ── 3. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: [...requests],
      meta: {
        totalRequests: totalCount,
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
    throw new Error(
      'Unknown error occurred in get my connection requests service'
    );
  }
};

export const manageMyConnectionRequestService = async ({
  requestId,
  requestStatus,
  user,
}: {
  user: User;
  requestStatus: FriendshipStatus;
  requestId: string;
}): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      // ── 1. Update the friend request status ───────────────────────
      const updatedRequest = await tx.friends.update({
        where: { id: requestId, receiverId: user.id },
        data: { status: requestStatus },
        select: { senderId: true, receiverId: true },
      });

      // ── 2. ADDED: If ACCEPTED — create PRIVATE conversation ───────
      //
      // Only runs when the request is accepted, not rejected.
      // Creates the conversation, adds both users as participants,
      // and creates ConversationSettings for each user.
      //
      if (requestStatus === FriendshipStatus.ACCEPTED) {
        const conversation = await tx.conversation.create({
          data: {
            type: ConversationType.PRIVATE,
          },
          select: { id: true },
        });

        // Add both users as ConversationParticipants
        await tx.conversationParticipant.createMany({
          data: [
            {
              conversationId: conversation.id,
              userId: updatedRequest.senderId,
            },
            {
              conversationId: conversation.id,
              userId: updatedRequest.receiverId,
            },
          ],
        });

        // Create ConversationSettings for both users
        await tx.conversationSettings.createMany({
          data: [
            {
              conversationId: conversation.id,
              userId: updatedRequest.senderId,
            },
            {
              conversationId: conversation.id,
              userId: updatedRequest.receiverId,
            },
          ],
        });
      }

      if (requestStatus === FriendshipStatus.ACCEPTED) {
        const accepter = await prisma.user.findUnique({
          where: { id: user.id },
          include: { profile: { select: { name: true } } },
        });

        const systemQueue = getSystemQueue();
        await systemQueue.add('notify-friend-accept', {
          targetUserId: updatedRequest.senderId,
          accepterName: accepter?.profile?.name || 'User',
          traceId: getTraceId(),
        });
      }
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in manage my connection requests service'
    );
  }
};

export const blockOneConnectionService = async ({
  id,
  user,
  blockStatus,
}: {
  user: User;
  id: string;
  blockStatus: BLOCK_STATUS;
}): Promise<void> => {
  try {
    if (blockStatus === BLOCK_STATUS.BLOCKED) {
      // ── Block: create a new BlockList row ─────────────────────
      await prisma.blockList.create({
        data: {
          blockerId: user.id,
          blockedUserId: id,
        },
      });
    } else {
      // ── Unblock: remove the existing BlockList row ────────────
      await prisma.blockList.delete({
        where: {
          blockerId_blockedUserId: {
            blockerId: user.id,
            blockedUserId: id,
          },
        },
      });
    }

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in block one connection service');
  }
};

export const sendFriendRequestService = async ({
  payload,
  user,
}: {
  user: User;
  payload: TSendFriendRequestPayload;
}): Promise<unknown> => {
  try {
    const { receiverId, requestStatus } = payload;

    const friendRequest = await prisma.$transaction(async (tx) => {
      // ── 1. Clean up any existing (e.g. REJECTED) requests ──────────
      // This prevents Unique Constraint Violations if they try to connect again.
      await tx.friends.deleteMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: receiverId },
            { senderId: receiverId, receiverId: user.id },
          ],
        },
      });

      // ── 2. Create the new request ──────────────────────────────────
      return await tx.friends.create({
        data: {
          senderId: user.id,
          receiverId,
          status: requestStatus,
        },
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          status: true,
          createdAt: true,
        },
      });
    });

    if (requestStatus === FriendshipStatus.PENDING) {
      const requester = await prisma.user.findUnique({
        where: { id: user.id },
        include: { profile: { select: { name: true } } },
      });

      const systemQueue = getSystemQueue();
      await systemQueue.add('notify-friend-request', {
        targetUserId: receiverId,
        requesterName: requester?.profile?.name || 'User',
        traceId: getTraceId(),
      });
    }

    return friendRequest;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in send friend request service');
  }
};
