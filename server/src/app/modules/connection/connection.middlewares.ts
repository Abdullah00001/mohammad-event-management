import { Request, Response, NextFunction } from 'express';

import { asyncHandler } from '@/app/utils/system.utils';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { FriendshipStatus, User } from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { BLOCK_STATUS } from '@/app/modules/connection/connection.types';

export const checkIsConnectionExistMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    if (!id) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'id not found',
        traceId,
      });
      return;
    }
    // ── 1. Check user exists ──────────────────────────────────────
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found',
        traceId,
      });
      return;
    }

    // ── 2. Check is an accepted friend of the logged-in user ──────
    //
    // Check both directions of the friendship row
    //
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

    if (!friendship) {
      res.status(403).json({
        success: false,
        status: 403,
        message: 'User is not your connection',
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

export const manageMyConnectionRequestsMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { requestId } = req.body;

    // ── 1. Check friend request exists ───────────────────────────
    const request = await prisma.friends.findUnique({
      where: { id: requestId },
      select: { id: true, receiverId: true, status: true },
    });

    if (!request) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Friend request not found',
        traceId,
      });
      return;
    }

    // ── 2. Check request belongs to the logged-in user ────────────
    if (request.receiverId !== user.id) {
      res.status(403).json({
        success: false,
        status: 403,
        message: 'You are not authorized to manage this request',
        traceId,
      });
      return;
    }

    // ── 3. Check request is still PENDING ─────────────────────────
    if (request.status !== FriendshipStatus.PENDING) {
      res.status(400).json({
        success: false,
        status: 400,
        message: 'Friend request has already been managed',
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

export const blockOneConnectionMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    const { blockStatus } = req.body;

    // ── 1. Fetch current BlockList row ────────────────────────────
    const existingBlock = await prisma.blockList.findUnique({
      where: {
        blockerId_blockedUserId: {
          blockerId: user.id,
          blockedUserId: id,
        },
      },
      select: { id: true },
    });

    if (blockStatus === BLOCK_STATUS.BLOCKED) {
      // ── 2a. BLOCK: reject if already blocked ───────────────────
      if (existingBlock) {
        res.status(400).json({
          success: false,
          status: 400,
          message: 'User is already blocked',
          traceId,
        });
        return;
      }
    } else {
      // ── 2b. UNBLOCK: reject if not currently blocked ───────────
      if (!existingBlock) {
        res.status(400).json({
          success: false,
          status: 400,
          message: 'User is not blocked',
          traceId,
        });
        return;
      }
    }

    next();
    return;
  }
);

export const checkIsUserBlockMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { id } = req.params as { id: string };
    const block = await prisma.blockList.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedUserId: id },
          { blockerId: id, blockedUserId: user.id },
        ],
      },
      select: { blockerId: true },
    });
    if (block) {
      const message =
        block.blockerId === user.id
          ? 'You have blocked this user'
          : 'You have been blocked by this user';

      res.status(403).json({ success: false, status: 403, message, traceId });
      return;
    }
    next();
    return;
  }
);

export const checkReceiverExistMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const { receiverId } = req.body as { receiverId: string };

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Receiver not found',
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

export const checkDuplicateFriendRequestMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { receiverId } = req.body as { receiverId: string };

    const existingRequest = await prisma.friends.findFirst({
      where: {
        OR: [
          { senderId: user.id, receiverId: receiverId },
          { senderId: receiverId, receiverId: user.id },
        ],
      },
    });

    if (existingRequest && existingRequest.status !== FriendshipStatus.REJECTED) {
      const message =
        existingRequest.status === FriendshipStatus.ACCEPTED
          ? 'You are already friends with this user'
          : 'A friend request already exists between you and this user';
      res.status(409).json({
        success: false,
        status: 409,
        message,
        traceId,
      });
      return;
    }

    next();
    return;
  }
);

export const checkReceiverBlockStatusMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const { receiverId } = req.body as { receiverId: string };

    const block = await prisma.blockList.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedUserId: receiverId },
          { blockerId: receiverId, blockedUserId: user.id },
        ],
      },
      select: { blockerId: true },
    });

    if (block) {
      const message =
        block.blockerId === user.id
          ? 'You have blocked this user'
          : 'You have been blocked by this user';

      res.status(403).json({ success: false, status: 403, message, traceId });
      return;
    }
    next();
    return;
  }
);
