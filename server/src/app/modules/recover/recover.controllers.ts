import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  findRecoverUSer,
  resendRecoverUserOtp,
  resetRecoverUserPassword,
  verifyRecoverUserOtp,
} from '@/app/modules/recover/recover.services';
import { extractToken } from '@/app/utils/jwt.utils';
import { asyncHandler } from '@/app/utils/system.utils';

export const findRecoverUserController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    const token = await findRecoverUSer({ user, traceId });
    res.status(200).json({
      success: true,
      message: 'Recover user found and otp send successfully',
      data: { otpPageToken: token },
      traceId,
    });
    return;
  }
);

export const verifyRecoverUserOtpController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as JwtPayload;
    await verifyRecoverUserOtp({ user });
    res.status(200).json({
      success: true,
      message: 'Otp verification successful',
      traceId,
    });
    return;
  }
);

export const resetRecoverUserPasswordController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as JwtPayload;
    const token = extractToken(req);
    const { password } = req.body;
    await resetRecoverUserPassword({
      jwt: token as string,
      password,
      user,
      traceId,
    });
    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      traceId,
    });
    return;
  }
);

export const resendRecoverUserOtpController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as JwtPayload;
    await resendRecoverUserOtp({
      user,
      traceId,
    });
    res.status(200).json({
      success: true,
      message: 'OTP reset successful',
      traceId,
    });
    return;
  }
);
