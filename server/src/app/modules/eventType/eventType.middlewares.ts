import { NextFunction, Request, Response } from 'express';

import prisma from '@/app/configs/db.configs';
import { asyncHandler } from '@/app/utils/system.utils';

export const findEventTypeById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = await prisma.eventType.findUnique({
      where: { id: id as string },
    });
    if (!data) {
      res.status(404).json({
        success: true,
        message: `Event Type not found with this id ${id}`,
      });
      return;
    }
    req.eventType = data;
    next();
  }
);
