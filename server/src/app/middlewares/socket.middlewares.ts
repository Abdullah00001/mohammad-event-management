import { AccountStatus, User } from '@prisma/client';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { AuthenticatedSocket } from '@/app/@types/jwt.types';
import prisma from '@/app/configs/db.configs';
import logger from '@/app/configs/logger.configs';
import { requestContext } from '@/app/configs/requestContext.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import {
  extractTokenFromSocketHeader,
  verifyAccessToken,
} from '@/app/utils/jwt.utils';

export const socketTraceMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  const traceIdFromHeader = socket.handshake.headers['x-trace-id'];
  const traceIdFromQuery = socket.handshake.query?.traceId;
  const traceId =
    typeof traceIdFromHeader === 'string'
      ? traceIdFromHeader
      : typeof traceIdFromQuery === 'string'
        ? traceIdFromQuery
        : Array.isArray(traceIdFromQuery)
          ? traceIdFromQuery[0]
          : uuidv4();

  socket.traceId = traceId;

  requestContext.run({ traceId }, () => {
    next();
  });
};

export const socketAuthMiddleware = async (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  try {
    const token = extractTokenFromSocketHeader(socket);
    if (!token) {
      logger.warn(`Socket auth failed — no token provided: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: No token provided'));
    }
    const redisClient = getRedisClient();
    const isBlackListed = await redisClient.get(`blacklist:jwt:${token}`);

    if (isBlackListed) {
      logger.warn(`Socket auth failed — Token blacklisted: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: Token blacklisted'));
    }
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      logger.warn(`Socket auth failed — Invalid token: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: Invalid token provided'));
    }
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      logger.warn(`Socket auth failed — user not found: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: User not found'));
    }
    if (user?.accountStatus === AccountStatus.BLOCKED) {
      logger.warn(`Socket auth failed — Invalid token: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: Invalid token provided'));
    }
    // Attach user payload to socket for downstream use
    socket.user = user as User;

    socket.use((packet, nextPacket) => {
      const packetTraceId = socket.traceId ?? uuidv4();
      requestContext.run({ traceId: packetTraceId }, () => nextPacket());
    });

    logger.info(`Socket authenticated — userId: ${decoded?.sub}`);
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      logger.warn(`Socket auth failed — token expired: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: Token expired'));
    }

    if (err instanceof JsonWebTokenError) {
      logger.warn(`Socket auth failed — invalid token: ${socket.id}`);
      return next(new Error('UNAUTHORIZED: Invalid token'));
    }

    logger.error(`Socket auth error: ${err}`);
    next(new Error('INTERNAL_ERROR: Authentication failed'));
  }
};
