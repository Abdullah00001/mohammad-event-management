import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@/const';
import { EventStatus, FriendshipStatus, User } from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { BLOCK_STATUS } from '@/app/modules/connection/connection.types';

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

    // ── 1. Shared where clause ────────────────────────────────────
    const sharedWhere = {
      status: FriendshipStatus.ACCEPTED,
      OR: [
        {
          senderId: user.id,
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
              isPremium: true,
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
              isPremium: true,
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
    const friends = rawFriends.map((f) => {
      const friend = f.senderId === user.id ? f.receiver : f.sender;

      return {
        friendshipId: f.id,
        userId: friend.id,
        isPremium: friend.isPremium,
        name: friend.profile?.name ?? null,
        avatar: friend.profile?.avatar ?? null,
        bio: friend.profile?.bio ?? null,
        connectedAt: f.createdAt,
        // ADDED: derived from joined rows — no extra queries needed
        isBlockedByMe: friend.blockedBy.length > 0,
        isBlockedMe: friend.blockedUsers.length > 0,
      };
    });

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
 

export const getMySingleConnectionService = async ({ id }: { id: string }) => {
  try {
    // ── 1. Fetch friend's user + profile ──────────────────────────
    const friend = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        isPremium: true,
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
    //
    // Total events the friend has participated in (any role, not DELETED)
    //
    const eventsJoinedCount = await prisma.eventParticipants.count({
      where: {
        participantId: id,
        event: {
          eventStatus: { not: EventStatus.DELETED },
        },
      },
    });

    // ── 3. Connections count ──────────────────────────────────────
    //
    // Total ACCEPTED friendships in both directions
    //
    const connectionsCount = await prisma.friends.count({
      where: {
        OR: [
          { senderId: id, status: FriendshipStatus.ACCEPTED },
          { receiverId: id, status: FriendshipStatus.ACCEPTED },
        ],
      },
    });

    // ── 4. Return friend profile ──────────────────────────────────
    //
    // connectionStatus is always MESSAGE — this service is only reachable
    // after checkIsConnectionExistMiddleware confirms ACCEPTED friendship
    //
    return {
      id: friend.id,
      isPremium: friend.isPremium,
      isProfileSetup: friend.isProfileSetup,

      // Profile fields
      name: friend.profile?.name ?? null,
      avatar: friend.profile?.avatar ?? null,
      cover: friend.profile?.cover ?? null,
      bio: friend.profile?.bio ?? null,
      location: friend.profile?.location ?? null,
      gender: friend.profile?.gender ?? null,
      age: friend.profile?.age ?? null,
      profileInterest: friend.profile?.profileInterest ?? [],
      countryVisited: friend.profile?.countryVisited ?? [],

      // Stats
      eventsJoinedCount,
      connectionsCount,

      // Always MESSAGE — confirmed friend
      connectionStatus: 'MESSAGE' as const,
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
}): Promise<unknown> => {
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
              isPremium: true,
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
    const requests = rawRequests.map((f) => ({
      friendshipId: f.id,
      userId: f.sender.id,
      isPremium: f.sender.isPremium,
      name: f.sender.profile?.name ?? null,
      avatar: f.sender.profile?.avatar ?? null,
      bio: f.sender.profile?.bio ?? null,
      requestedAt: f.createdAt,
    }));

    // ── 3. Paginate & respond ─────────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: requests,
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
    await prisma.friends.update({
      where: { id: requestId, receiverId: user.id },
      data: { status: requestStatus },
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
