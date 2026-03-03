import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { signupService } from '@/app/modules/user/user.services';
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
