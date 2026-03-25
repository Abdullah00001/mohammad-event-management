import { User } from '@prisma/client';
import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';

import { getTraceId } from '@/app/configs/requestContext.configs';
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
    const traceId = getTraceId();
    const data = await retrieveSubscriptionFeaturesService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription feature retrieve Successful',
      data,
      traceId,
    });
    return;
  }
);

export const createSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as JwtPayload;
    const traceId = getTraceId();
    const requestBodyPayload = req.body as TPlan;
    await createSubscriptionPlanService({ requestBodyPayload, user });
    res.status(201).json({
      success: true,
      status: 201,
      message: 'Subscription Plan Creation Successful',
      traceId,
    });
    return;
  }
);

export const retrieveSubscriptionPlansController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const data = await retrieveSubscriptionPlansService();
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plans Retrieve Successful',
      data,
      traceId,
    });
    return;
  }
);

export const retrieveSingleSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const plan = req.plan;
    const data = await retrieveSingleSubscriptionPlanService({
      plan,
    });
    if (!data) {
      res.status(404).json({
        success: false,
        status: 404,
        message: 'Subscription Plan Not Found',
        traceId,
      });
      return;
    }
    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Retrieve Successful',
      data,
      traceId,
    });
    return;
  }
);

export const updateSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as JwtPayload;
    const plan = req.plan;
    const requestBodyPayload = req.body as TPlan;

    await updateSubscriptionPlanService({
      plan,
      requestBodyPayload,
      user,
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Update Successful',
      traceId,
    });
    return;
  }
);

export const deleteSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user as JwtPayload;
    const plan = req.plan;
    const traceId = getTraceId();

    await deleteSubscriptionPlanService({ plan, user });

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Deleted Successfully',
      traceId,
    });
    return;
  }
);

export const stripePaymentIntentController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription Plan Deleted Successfully',
      traceId,
    });
    return;
  }
);
