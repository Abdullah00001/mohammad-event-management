import { User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  loginService,
  resendSignupUserOtp,
  signupService,
  verifySignupUserOtp,
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
  async (req: Request, res: Response) => {
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
  async (req: Request, res: Response) => {
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
  async (req: Request, res: Response) => {
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
  async (req: Request, res: Response) => {
    const { rememberMe } = req.body;
    const path = req.path;
    const isAdminLogin = path.includes('/admin/login');
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
