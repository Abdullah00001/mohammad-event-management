import { AccountStatus, Profile, Role, User } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import prisma from '@/app/configs/db.configs';
import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { AuthErrorType } from '@/app/modules/user/user.types';
import {
  extractToken,
  generateOtpPageToken,
  verifyAccessToken,
  verifyOtpPageToken,
  verifyRefreshToken,
} from '@/app/utils/jwt.utils';
import { compareOtp, hashOtp } from '@/app/utils/otp.utils';
import { comparePassword } from '@/app/utils/password.utils';
import { asyncHandler, calculateMilliseconds } from '@/app/utils/system.utils';
import { generate } from 'otp-generator';
import { otpExpireAt } from '@/const';
import { getEmailQueue } from '@/app/queues/queues';

export const findUserWithEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    const path = req.path;
    const isLogin = path.includes('login');
    const isSignup = path.includes('signup');
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (isSignup && !user) {
      next();
      return;
    }
    if (isSignup && user) {
      if (user.isVerified === true) {
        res.status(409).json({
          success: false,
          message: 'User With This Email Already Exist!',
          errorType: AuthErrorType.DUPLICATE_DATA,
          traceId,
        });
        return;
      } else {
        const otp = generate(6, {
          digits: true,
          lowerCaseAlphabets: false,
          specialChars: false,
          upperCaseAlphabets: false,
        });
        const hashedOtp = hashOtp({ otp });
        const jwtToken = generateOtpPageToken({
          sub: String(user.id),
          role: user.role,
          isVerified: user.isVerified,
          accountStatus: user.accountStatus,
        });
        const emailData = {
          email: user.email,
          expirationTime: otpExpireAt,
          otp,
          traceId,
        };
        const redisClient = getRedisClient();
        const ttl = calculateMilliseconds(otpExpireAt, 'minute');
        await Promise.all([
          redisClient.set(`user:${user.id}:otp`, hashedOtp, 'PX', ttl),
          getEmailQueue().add('send-signup-user-verify-otp-email', emailData),
        ]);
        res.status(200).json({
          success: true,
          message:
            "Signup successful, Please check your email, We've sent you the otp for verify your account!",
          data: {
            isProfileSetup: user.isProfileSetup,
            signupPageToken: jwtToken,
            otp,
          },
          traceId,
        });
        return;
      }
    }
    if (isLogin && !user) {
      res.status(404).json({
        success: false,
        message: 'Invalid Credential,Please Check Your Email And Password!',
        errorType: AuthErrorType.INVALID_CREDENTIALS,
        traceId,
      });
      return;
    }
    req.user = user as User;
    next();
    return;
  }
);

export const isAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user;
    if (user.role !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        message: 'Access denied, admin privileges required',
        errorType: AuthErrorType.ACCESS_DENIED,
        traceId,
      });
      return;
    }
    next();
  }
);

export const checkOtpPageToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token not found',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
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
        traceId,
      });
      return;
    }
    const decoded = verifyOtpPageToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
      });
      return;
    }
    req.user = decoded;
    next();
  }
);

export const checkOtp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as JwtPayload;
    const { otp } = req.body;
    // get the redis client
    const redisClient = getRedisClient();
    const hashedOtp = await redisClient.get(`user:${user.sub}:otp`);
    if (!hashedOtp) {
      res.status(401).json({
        success: false,
        message: 'OTP has expired, please request a new one',
        errorType: AuthErrorType.OTP_EXPIRED,
        traceId,
      });
      return;
    }
    const isMatched = compareOtp({ hashedOtp, otp });
    if (!isMatched) {
      res.status(401).json({
        success: false,
        message: 'Invalid OTP, please check and try again',
        errorType: AuthErrorType.INVALID_OTP,
        traceId,
      });
      return;
    }
    next();
  }
);

export const checkPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const { password } = req.body;
    const hashedPassword = (req.user as User).password as string;
    const isMatched = await comparePassword(password, hashedPassword);
    if (!isMatched) {
      res.status(401).json({
        success: false,
        errorType: AuthErrorType.INVALID_CREDENTIALS,
        message: 'Invalid Credential,Check Your Email And Password',
        traceId,
      });
      return;
    }
    next();
  }
);

export const checkAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token not found',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
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
        traceId,
      });
      return;
    }
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
      });
      return;
    }
    req.user = decoded;
    
    // Background activity tracking
    const userId = decoded.sub as string | undefined;
    if (userId) {
      const activeKey = `activity:${userId}`;
      redisClient.set(activeKey, '1', 'EX', 300, 'NX').then((setResult: any) => {
        if (setResult === 'OK') {
          prisma.user.update({
            where: { id: userId },
            data: { lastActiveAt: new Date() }
          }).catch((err: any) => logger.error('Failed to update activity', err));
        }
      });
    }

    next();
  }
);

export const checkAdminAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    const token = req?.cookies?.accesstoken || extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized request, authentication required',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
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
        traceId,
      });
      return;
    }
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
      });
      return;
    }
    req.user = decoded;
    next();
  }
);

export const checkAdminRefreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const token = req?.cookies?.refreshtoken || extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized request, refresh token required',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
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
        traceId,
      });
      return;
    }
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
      });
      return;
    }
    req.user = decoded;
    next();
  }
);

export const checkAccountStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const traceId = getTraceId();
    const route = req.path;
    const { sub } = req.user as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) {
      res.status(401).json({
        success: false,
        message:
          'Authentication failed. User record associated with this token does not exist.',
        errorType: AuthErrorType.TOKEN_INVALID,
        traceId,
      });
      return;
    }
    if (user?.accountStatus === AccountStatus.BLOCKED) {
      res.status(401).json({
        success: false,
        message: 'Access denied, your account has been blocked',
        errorType: AuthErrorType.USER_BLOCKED,
        traceId,
      });
      return;
    }
    const isLogoutRoute = route.startsWith('/auth/logout');
    const profile = await prisma.profile.findUnique({ where: { userId: sub } });
    req.profile = profile as Profile;
    if (!isLogoutRoute) req.user = user as User;
    next();
  }
);

export const checkDeviceFcmAccessToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as User;
    const isExist = await prisma.device.findFirst({
      where: {
        fcmToken: req.body.fcmToken,
        userId: user.id,
      },
    });
    if (isExist) {
      await prisma.device.delete({
        where: {
          id: isExist.id,
        },
      });
    }
    next();
    return;
  }
);
