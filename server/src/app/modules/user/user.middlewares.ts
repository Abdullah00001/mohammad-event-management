import { Request, Response, NextFunction } from 'express';

import prisma from '@/app/configs/db.configs';
import { IUser } from '@/app/modules/user/user.types';
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
      });
      return;
    }
    if (isLogin && !user) {
      res.status(404).json({
        success: true,
        message: 'Invalid Credential,Please Check Your Email And Password!',
      });
      return;
    }
    req.user = user as IUser;
    next();
    return;
  }
);
