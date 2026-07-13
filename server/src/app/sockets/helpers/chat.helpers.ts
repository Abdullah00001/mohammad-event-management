import prisma from '@/app/configs/db.configs';

/**
 * Check if either user has blocked the other.
 */
export async function isBlocked(
  userId: string,
  targetUserId: string
): Promise<boolean> {
  if (userId === targetUserId) return true; // self-block

  const block = await prisma.blockList.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedUserId: targetUserId },
        { blockerId: targetUserId, blockedUserId: userId },
      ],
    },
  });
  return !!block;
}

/**
 * Get all user IDs that have blocked the given user.
 */
export async function getBlockedBy(userId: string): Promise<string[]> {
  const blocks = await prisma.blockList.findMany({
    where: { blockedUserId: userId },
    select: { blockerId: true },
  });
  return blocks.map((b) => b.blockerId);
}

/**
 * Get all user IDs that the given user has blocked.
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  const blocks = await prisma.blockList.findMany({
    where: { blockerId: userId },
    select: { blockedUserId: true },
  });
  return blocks.map((b) => b.blockedUserId);
}

export async function isConversationParticipant(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  return !!participant;
}

export async function getConversation(conversationId: string) {
  return prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { event: true, participants: true },
  });
}

export async function getOtherParticipants(
  conversationId: string,
  userId: string
) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: userId } },
    include: {
      user: {
        include: { profile: true, devices: true },
      },
    },
  });
  return participants.map((p) => ({
    userId: p.userId,
    name: p.user.profile?.name || 'User',
    fcmTokens: p.user.devices.map((d) => d.fcmToken),
  }));
}
