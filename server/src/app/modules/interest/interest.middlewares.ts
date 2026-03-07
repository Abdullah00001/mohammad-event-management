import { NextFunction, Request, Response } from 'express';

import prisma from '@/app/configs/db.configs';
import { asyncHandler } from '@/app/utils/system.utils';

export const findInterestById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const interest = await prisma.interest.findUnique({
      where: { id: id as string },
    });
    if (!interest) {
      res.status(404).json({
        success: true,
        message: `Interest not found with this id ${id}`,
      });
      return;
    }
    req.interest = interest;
    next();
  }
);
