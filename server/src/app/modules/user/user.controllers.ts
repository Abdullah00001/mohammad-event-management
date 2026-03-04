import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import {
  resendSignupUserOtp,
  signupService,
  verifySignupUserOtp,
} from '@/app/modules/user/user.services';
import { extractToken } from '@/app/utils/jwt.utils';
import { asyncHandler } from '@/app/utils/system.utils';

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
    await verifySignupUserOtp({ token, user });
    res
      .status(200)
      .json({ success: true, message: 'Otp verification successful', traceId });
    return;
  }
);

export const resendSignupUserOtpController = asyncHandler(
  async (req: Request, res: Response) => {
    const traceId = getTraceId();
    const user = req.user;
    await resendSignupUserOtp({user})
    res.status(200).json({
      success: true,
      message: 'Otp resend successful',
      traceId,
    });
    return;
  }
);
