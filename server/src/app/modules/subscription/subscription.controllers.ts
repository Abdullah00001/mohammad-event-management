import { Request, Response } from 'express';

import { createSubscriptionPlanService } from '@/app/modules/subscription/subscription.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const retrieveSubscriptionFeaturesController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      status: 201,
      message: 'Subscription feature retrieve Successful',
    });
    return;
  }
);

export const createSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const requestBodyPayload = req.body;
    await createSubscriptionPlanService(requestBodyPayload);
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Subscription Creation Successful',
    });
    return;
  }
);
