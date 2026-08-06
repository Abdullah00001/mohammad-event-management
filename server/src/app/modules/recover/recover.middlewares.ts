import { Request, Response, NextFunction } from 'express';

import { getRedisClient } from '@/app/configs/redis.config';
import { AuthErrorType } from '@/app/modules/user/user.types';
import { verifyOtpPageToken } from '@/app/utils/jwt.utils';
import { asyncHandler } from '@/app/utils/system.utils';

export const checkAdminOtpPageToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.otp_page_token;
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token not found',
        errorType: AuthErrorType.TOKEN_INVALID,
      });
      return;
    }
    const redisClient = getRedisClient();
    const isBlackListed = await redisClient.get(`blacklist:jwt:${token}`);
    if (isBlackListed) {
      res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        errorType: AuthErrorType.TOKEN_BLACKLISTED,
      });
      return;
    }
    const decoded = verifyOtpPageToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errorType: AuthErrorType.TOKEN_INVALID,
      });
      return;
    }
    req.user = decoded;
    next();
  }
);
