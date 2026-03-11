import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  adminRefreshToken,
  loginService,
  resendSignupUserOtp,
  signupService,
  verifySignupUserOtp,
  retrieveUserList,
} from '@/app/modules/user/user.services';
import { cookieOption } from '@/app/utils/cookie.utils';
import { extractToken } from '@/app/utils/jwt.utils';
import { asyncHandler } from '@/app/utils/system.utils';
import {
  adminAccessTokenExpiresIn,
  refreshTokenExpiresInWithOutRememberMe,
  refreshTokenExpiresInWithRememberMe,
} from '@/const';

export const signupController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { email, password } = req.body;
    const data = await signupService({ email, password });
    res
      .status(200)
      .json({ success: true, message: 'Signup successful', data, traceId });
    return;
  }
);

export const verifySignupUserController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const token = extractToken(req) as string;
    const user = req.user;
    const { accessToken } = await verifySignupUserOtp({ token, user });
    res.status(200).json({
      success: true,
      message: 'Otp verification successful',
      data: { accessToken },
      traceId,
    });
    return;
  }
);

export const resendSignupUserOtpController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user;
    await resendSignupUserOtp({ user });
    res.status(200).json({
      success: true,
      message: 'Otp resend successful',
      traceId,
    });
    return;
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { rememberMe } = req.body;
    const path = req.path;
    const isAdminLogin = path.includes('/admin/auth/login');
    const traceId = getTraceId();
    const user = req.user as User;
    const { accessToken, refreshToken } = await loginService({
      isAdmin: isAdminLogin,
      user,
      rememberMe,
    });
    if (isAdminLogin && refreshToken) {
      const refreshTokenExpireIn = rememberMe
        ? refreshTokenExpiresInWithRememberMe
        : refreshTokenExpiresInWithOutRememberMe;
      res.cookie(
        'accesstoken',
        accessToken,
        cookieOption(adminAccessTokenExpiresIn)
      );
      res.cookie(
        'refreshtoken',
        refreshToken,
        cookieOption(refreshTokenExpireIn)
      );
      res
        .status(200)
        .json({ success: true, message: 'Login successful', traceId });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { accessToken },
      traceId,
    });
    return;
  }
);

export const checkAccessTokenController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    res
      .status(200)
      .json({ success: true, message: 'User Is Authenticated', traceId });
    return;
  }
);

export const adminRefreshTokenController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as JwtPayload;
    const { jwt } = await adminRefreshToken({ user });
    res.cookie('accesstoken', jwt, cookieOption(adminAccessTokenExpiresIn));
    res
      .status(200)
      .json({ success: true, message: 'Token refresh successful', traceId });
    return;
  }
);

export const retrieveUserListController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const { page, limit, sortBy } = req.query as {
      page: string;
      limit: string;
      sortBy: string;
    };
    const user = req.user as JwtPayload;
    const path = req.path;
    const data = await retrieveUserList({ page, limit, sortBy, user, path });
    res
      .status(200)
      .json({
        success: true,
        message: 'User retrieved successful',
        ...data,
        traceId,
      });
    return;
  }
);
