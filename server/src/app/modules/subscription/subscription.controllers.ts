import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { TPlan } from '@/app/modules/subscription/subscription.schemas';
import {
  createSubscriptionPlanService,
  retrieveSubscriptionFeaturesService,
} from '@/app/modules/subscription/subscription.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const retrieveSubscriptionFeaturesController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const data = await retrieveSubscriptionFeaturesService();
    res.status(200).json({
      success: true,
      status: 201,
      message: 'Subscription feature retrieve Successful',
      data,
    });
    return;
  }
);

export const createSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as JwtPayload;
    const requestBodyPayload = req.body as TPlan;
    await createSubscriptionPlanService({ requestBodyPayload, user });
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Subscription Plan Creation Successful',
    });
    return;
  }
);
