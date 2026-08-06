import { Request, Response, NextFunction } from 'express';
import { User } from '@prisma/client';
import { asyncHandler } from '@/app/utils/system.utils';
import { getTraceId } from '@/app/configs/requestContext.configs';
import prisma from '@/app/configs/db.configs';

// ── Check conversation exists and calling user is a participant ───────────────
export const checkConversationAccessMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };

    // ── 1. Check conversation exists and is not globally soft-deleted ──
    const conversation = await prisma.conversation.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Conversation not found',
        traceId,
      });
      return;
    }

    // ── 2. Check calling user is a participant ─────────────────────────
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!participant) {
      res.status(403).json({
        success: false,
        status: 403,
        message: 'You are not a participant of this conversation',
        traceId,
      });
      return;
    }

    // ── 3. Check conversation not soft-deleted for this user ───────────
    const settings = await prisma.conversationSettings.findUnique({
      where: {
        conversationId_userId: {
          conversationId: id,
          userId: user.id,
        },
      },
      select: { deletedAt: true },
    });

    if (settings?.deletedAt) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Conversation not found',
        traceId,
      });
      return;
    }

    next();
    return;
  }
);
