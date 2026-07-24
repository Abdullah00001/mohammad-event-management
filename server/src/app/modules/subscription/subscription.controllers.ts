import { Request, Response } from 'express';
import { User } from '@prisma/client';
import crypto from 'crypto';

import { getTraceId } from '@/app/configs/requestContext.configs';
import { asyncHandler } from '@/app/utils/system.utils';
import {
  getActiveSubscriptionPlansService,
  getDeveloperSubscriptionPlansService,
  getSingleDeveloperSubscriptionPlanService,
  createSubscriptionPlanService,
  updateSubscriptionPlanService,
  getDeveloperFeaturesService,
  createFeatureService,
  updateFeatureService,
  getUserSubscriptionService,
  syncUserSubscriptionService,
} from './subscription.services';
import { env } from '@/env';
import { getSubscriptionWebhookQueue } from '@/app/queues/queues';
import { ESubscriptionWebhookJobName } from '@/app/@types/queue.types';

// --- Public / App Plans ---

export const getActivePlansController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const plans = await getActiveSubscriptionPlansService();

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Active subscription plans retrieved successfully',
      data: plans,
      traceId,
    });
  }
);

// --- Auth Plan (Mobile single source of truth) ---

export const getMySubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    
    const userSub = await getUserSubscriptionService(user.id);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'User subscription retrieved successfully',
      data: userSub || null,
      traceId,
    });
  }
);

// --- Sync Subscription (Triggered by client after purchase) ---

export const syncSubscriptionController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const user = req.user as User;
    
    const userSub = await syncUserSubscriptionService(user.id);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription synchronized successfully',
      data: userSub || null,
      traceId,
    });
  }
);

// --- RevenueCat Webhook ---

export const webhookRevenueCatController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    
    // Validate webhook signature / Bearer token
    if (!authHeader) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const expectedHeader = `Bearer ${env.REVENUECAT_WEBHOOK_SECRET}`;
    
    // Use timingSafeEqual to prevent timing attacks
    const providedBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedHeader);
    
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const payload = req.body;
    
    // Immediately enqueue to BullMQ and return 200 to RevenueCat
    await getSubscriptionWebhookQueue().add(ESubscriptionWebhookJobName.REVENUECAT_WEBHOOK, payload, {
      jobId: payload.event?.id || `rc-webhook-${Date.now()}`, // fallback if payload is malformed
    });

    res.status(200).json({ success: true, message: 'Webhook received' });
  }
);

// --- Developer Features ---

export const getFeaturesController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const features = await getDeveloperFeaturesService();

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Features retrieved successfully',
      data: features,
      traceId,
    });
  }
);

export const createFeatureController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const payload = req.body;
    const feature = await createFeatureService(payload);

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Feature created successfully',
      data: feature,
      traceId,
    });
  }
);

export const updateFeatureController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const id = req.params.id as string;
    const payload = req.body;
    
    const feature = await updateFeatureService(id, payload);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Feature updated successfully',
      data: feature,
      traceId,
    });
  }
);

// --- Developer Plans ---

export const getDeveloperPlansController = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const plans = await getDeveloperSubscriptionPlansService();

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription plans retrieved successfully',
      data: plans,
      traceId,
    });
  }
);

export const getSingleDeveloperPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const id = req.params.id as string;
    const plan = await getSingleDeveloperSubscriptionPlanService(id);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription plan retrieved successfully',
      data: plan,
      traceId,
    });
  }
);

export const createSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const payload = req.body;
    
    const plan = await createSubscriptionPlanService(payload);

    res.status(201).json({
      success: true,
      status: 201,
      message: 'Subscription plan created successfully',
      data: plan,
      traceId,
    });
  }
);

export const updateSubscriptionPlanController = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const traceId = getTraceId();
    const id = req.params.id as string;
    const payload = req.body;
    
    const plan = await updateSubscriptionPlanService(id, payload);

    res.status(200).json({
      success: true,
      status: 200,
      message: 'Subscription plan updated successfully',
      data: plan,
      traceId,
    });
  }
);
