import { User } from '@prisma/client';
import { Request, Response } from 'express';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { updateProfile } from '@/app/modules/profile/profile.services';

export const updateProfileController = async (req: Request, res: Response) => {
  const traceId = getTraceId();
  const user = req.user as User;
  const payload = req.body;
  const data = await updateProfile({ user, payload });
  res.status(200).json({
    success: true,
    message: 'Profile update successful',
    data,
    traceId,
  });
  return;
};
