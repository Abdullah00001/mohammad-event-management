import { AccountStatus, User } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { AuthErrorType } from '@/app/modules/user/user.types';
import {
  extractToken,
  verifyAccessToken,
  verifyOtpPageToken,
  verifyRefreshToken,
} from '@/app/utils/jwt.utils';
import { compareOtp } from '@/app/utils/otp.utils';
import { comparePassword } from '@/app/utils/password.utils';
import { asyncHandler } from '@/app/utils/system.utils';

export const findUserWithEmail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
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
      res.status(409).json({
        success: true,
        message: 'User With This Email Already Exist!',
        errorType: AuthErrorType.DUPLICATE_DATA,
      });
      return;
    }
    if (isLogin && !user) {
      res.status(404).json({
        success: true,
        message: 'Invalid Credential,Please Check Your Email And Password!',
        errorType: AuthErrorType.INVALID_CREDENTIALS,
      });
      return;
    }
    req.user = user as User;
    next();
    return;
  }
);

export const checkOtpPageToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractToken(req);
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

export const checkOtp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
      });
      return;
    }
    const isMatched = compareOtp({ hashedOtp, otp });
    if (!isMatched) {
      res.status(401).json({
        success: false,
        message: 'Invalid OTP, please check and try again',
        errorType: AuthErrorType.INVALID_OTP,
      });
      return;
    }
    next();
  }
);

export const checkPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { password } = req.body;
    const hashedPassword = (req.user as User).password;
    const isMatched = await comparePassword(password, hashedPassword);
    if (!isMatched) {
      res.status(401).json({
        success: false,
        errorType: AuthErrorType.INVALID_CREDENTIALS,
        message: 'Invalid Credential,Check Your Email And Password',
      });
      return;
    }
    next();
  }
);

export const checkAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
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
    const decoded = verifyAccessToken(token);
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

export const checkAdminAccessToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req?.cookies?.accesstoken;
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized request, authentication required',
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
    const decoded = verifyAccessToken(token);
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

export const checkAdminRefreshToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req?.cookies?.refreshtoken;
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized request, refresh token required',
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
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        errorType: AuthErrorType.TOKEN_INVALID,
      });
      return;
    }
    req.user = decoded;
    next();
  }
);

export const checkAccountStatus = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const route = req.path;
    const { sub } = req.user as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (user?.accountStatus === AccountStatus.BLOCKED) {
      res.status(401).json({
        success: false,
        message: 'Access denied, your account has been blocked',
        errorType: AuthErrorType.USER_BLOCKED,
      });
      return;
    }
    const isLogoutRoute = route.startsWith('/auth/logout');
    if (!isLogoutRoute) req.user = user as User;
    next();
  }
);
