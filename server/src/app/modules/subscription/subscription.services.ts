import { SubscriptionFeature } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import { SubscriptionPlanDTO } from '@/app/modules/subscription/subscription.dto';
import { TPlan } from '@/app/modules/subscription/subscription.schemas';
import { expiresInTimeUnitToMs } from '@/app/utils/system.utils';
import { SUBSCRIPTION_FEATURE_CACHE_EXPIRY } from '@/const';

export const retrieveSubscriptionFeaturesService = async (): Promise<
  SubscriptionFeature[]
> => {
  try {
    const redisClient = getRedisClient();
    const ttl = expiresInTimeUnitToMs(SUBSCRIPTION_FEATURE_CACHE_EXPIRY);
    const cachedSubscriptionFeatures = await redisClient.get(
      'subscriptions:features'
    );
    if (cachedSubscriptionFeatures) {
      const data = JSON.parse(
        cachedSubscriptionFeatures
      ) as SubscriptionFeature[];
      return data;
    }
    const data = await prisma.subscriptionFeature.findMany({
      where: { isActive: true },
    });
    await redisClient.set(
      'subscriptions:features',
      JSON.stringify(data),
      'PX',
      ttl
    );
    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in retrieve subscription features plan service'
    );
  }
};

export const createSubscriptionPlanService = async ({
  requestBodyPayload,
  user,
}: {
  requestBodyPayload: TPlan;
  user: JwtPayload;
}): Promise<void> => {
  const { duration, features, price, title } = requestBodyPayload;
  try {
    await prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.create({
        data: {
          price,
          title,
          createdById: user.sub as string,
          intervalDays: duration,
        },
      });
      await tx.subscriptionPlanFeature.createMany({
        data: features.map((feature) => ({
          planId: plan.id,
          subscriptionFeatureId: feature,
        })),
      });
    });
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in create subscription plan service'
    );
  }
};

export const retrieveSubscriptionPlansService = async (): Promise<
  SubscriptionPlanDTO[]
> => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        intervalDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        planFeatures: {
          // JOIN → SubscriptionPlanFeature
          select: {
            feature: {
              // JOIN → SubscriptionFeature
              select: {
                id: true,
                featureKey: true,
                featureTitle: true,
                featureDescription: true,
                createdAt: true,
                updatedAt: true,
                isActive: true,
              },
            },
          },
          where: {
            feature: {
              isActive: true, // only active features
            },
          },
        },
      },
    });

    // Flatten the junction table so callers get a clean `features[]` array
    return plans.map((plan) => SubscriptionPlanDTO.fromEntity(plan));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in create subscription plan service'
    );
  }
};

export const retrieveSingleSubscriptionPlanService = async ({
  planId,
}: {
  planId: string;
}): Promise<SubscriptionPlanDTO | null> => {
  try {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        id: planId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        intervalDays: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        planFeatures: {
          select: {
            feature: {
              select: {
                id: true,
                featureKey: true,
                featureTitle: true,
                featureDescription: true,
                createdAt: true,
                updatedAt: true,
                isActive: true,
              },
            },
          },
          where: {
            feature: { isActive: true },
          },
        },
      },
    });

    if (!plan) return null;

    return SubscriptionPlanDTO.fromEntity(plan);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in retrieve subscription plan service'
    );
  }
};

export const updateSubscriptionPlanService = async ({
  planId,
  requestBodyPayload,
  user,
}: {
  planId: string;
  requestBodyPayload: TPlan;
  user: JwtPayload;
}): Promise<void> => {
  const { duration, features, price, title } = requestBodyPayload;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Verify plan exists and belongs to this user
      const existing = await tx.subscriptionPlan.findFirst({
        where: {
          id: planId,
          createdById: user.sub as string,
          deletedAt: null,
        },
      });

      if (!existing) throw new Error('Subscription plan not found');

      // 2. Update plan fields
      await tx.subscriptionPlan.update({
        where: { id: planId },
        data: {
          title,
          price,
          intervalDays: duration,
        },
      });

      // 3. Replace features — delete old junction rows, insert new ones
      await tx.subscriptionPlanFeature.deleteMany({
        where: { planId },
      });

      await tx.subscriptionPlanFeature.createMany({
        data: features.map((featureId) => ({
          planId,
          subscriptionFeatureId: featureId,
        })),
      });
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in update subscription plan service'
    );
  }
};

export const deleteSubscriptionPlanService = async ({
  planId,
  user,
}: {
  planId: string;
  user: JwtPayload;
}): Promise<void> => {
  try {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: {
        id: planId,
        createdById: user.sub as string,
        deletedAt: null,
      },
    });

    if (!existing) throw new Error('Subscription plan not found');

    // Soft delete
    await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in delete subscription plan service'
    );
  }
};
