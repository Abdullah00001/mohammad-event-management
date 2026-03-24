import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { TPlan } from '@/app/modules/subscription/subscription.schemas';
import {
  createSubscriptionPlanService,
  deleteSubscriptionPlanService,
  retrieveSingleSubscriptionPlanService,
  retrieveSubscriptionFeaturesService,
  retrieveSubscriptionPlansService,
  updateSubscriptionPlanService,
} from '@/app/modules/subscription/subscription.services';
import { asyncHandler } from '@/app/utils/system.utils';

export const retrieveSubscriptionFeaturesController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const data = await retrieveSubscriptionFeaturesService();
    res.status(200).json({
      success: true,
      status: 200,
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

export const retrieveSubscriptionPlansController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const data = await retrieveSubscriptionPlansService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plans Retrieve Successful',
      data,
    });
    return;
  }
);

export const retrieveSingleSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { planId } = req.params;
    const data = await retrieveSingleSubscriptionPlanService({
      planId: planId as string,
    });
    if (!data) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Subscription Plan Not Found',
      });
      return;
    }
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Retrieve Successful',
      data,
    });
    return;
  }
);

export const updateSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as JwtPayload;
    const { planId } = req.params;
    const requestBodyPayload = req.body as TPlan;

    await updateSubscriptionPlanService({
      planId: planId as string,
      requestBodyPayload,
      user,
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Update Successful',
    });
    return;
  }
);

export const deleteSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as JwtPayload;
    const { planId } = req.params;

    await deleteSubscriptionPlanService({ planId: planId as string, user });

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Deleted Successfully',
    });
    return;
  }
);
