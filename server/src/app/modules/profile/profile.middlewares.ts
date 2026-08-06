import { User } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

import { comparePassword } from '@/app/utils/password.utils';
import { asyncHandler } from '@/app/utils/system.utils';

export const checkCurrentPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { currentPassword } = req.body;
    const { password } = req.user as User;
    const isMatched = await comparePassword(
      currentPassword,
      password as string
    );
    if (!isMatched) {
      res
        .status(403)
        .json({ success: false, message: 'Current password not matched' });
      return;
    }
    next();
  }
);
