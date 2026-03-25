import { Request, Response, NextFunction } from 'express';

import prisma from '@/app/configs/db.configs';
import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';

export const findPlanById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = getTraceId();
    const { planId } = req.params;
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId as string },
    });
    if (!plan) {
      res.status(404).json({
        success: false,
        status: 404,
        message: `Subscription Plan Not Found With This Id : ${planId}`,
        traceId,
      });
      return;
    }
    req.plan = plan;
    next();
  }
);
