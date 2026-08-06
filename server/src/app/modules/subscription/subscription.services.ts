import { SubscriptionStatus, PurchasePlatform } from '@prisma/client';
import prisma from '@/app/configs/db.configs';
import { env } from '@/env';
import { RevenueCatSubscriberApi } from 'revenuecat';
import {
  TCreateFeature,
  TUpdateFeature,
  TCreateSubscriptionPlan,
  TUpdateSubscriptionPlan,
} from './subscription.schemas';
import { requestContext } from '@/app/configs/requestContext.configs';
import logger from '@/app/configs/logger.configs';
import { getRedisClient } from '@/app/configs/redis.config';

// ==========================================
// User Subscription & Authorization Services
// ==========================================

export const getUserSubscriptionService = async (userId: string) => {
  const store = requestContext.getStore();

  if (store && store.subscriptionCache) {
    if (store.subscriptionCache.has(userId)) {
      return store.subscriptionCache.get(userId);
    }
  }

  const userSub = await prisma.userSubscription.findUnique({
    where: { userId },
    include: {
      plan: {
        include: {
          features: {
            include: {
              feature: true,
            },
          },
        },
      },
    },
  });

  const formattedUserSub = userSub ? {
    ...userSub,
    lastEventTimestamp: userSub.lastEventTimestamp ? userSub.lastEventTimestamp.toString() : null,
  } : null;

  if (store) {
    if (!store.subscriptionCache) {
      store.subscriptionCache = new Map();
    }
    store.subscriptionCache.set(userId, formattedUserSub);
  }

  return formattedUserSub;
};

export const syncUserSubscriptionService = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    logger.warn(`[syncUserSubscriptionService] WEBHOOK_IGNORED_ORPHAN_USER User not found: ${userId}. Skipping sync.`);
    return null;
  }

  const redis = getRedisClient();
  const lockKey = `sync:sub:${userId}`;

  // Try to acquire lock (expires in 5 seconds to prevent deadlock)
  const acquired = await redis.set(lockKey, '1', 'PX', 5000, 'NX');
  if (!acquired) {
    logger.info(`[syncUserSubscriptionService] Sync already in progress for user: ${userId}. Waiting for lock to release...`);
    // Deduplication loop (check every 200ms up to 2.4s)
    for (let i = 0; i < 12; i++) {
      await new Promise((res) => setTimeout(res, 200));
      const stillLocked = await redis.get(lockKey);
      if (!stillLocked) {
        logger.info(`[syncUserSubscriptionService] Lock released for user: ${userId}. Returning deduplicated state.`);
        return getUserSubscriptionService(userId);
      }
    }
    logger.warn(`[syncUserSubscriptionService] LOCK_TIMEOUT Lock timeout for user: ${userId}. Returning current state.`);
    return getUserSubscriptionService(userId);
  }

  try {
    const startTime = Date.now();
    logger.info(`[syncUserSubscriptionService] SUBSCRIPTION_SYNC_STARTED for user: ${userId}`);
    const rcApi = new RevenueCatSubscriberApi(env.REVENUECAT_API_KEY || '');
    const dto = await rcApi.getNormalizedSubscriber(userId);

    const existingSub = await prisma.userSubscription.findUnique({ where: { userId } });
    
    // Prevent RevenueCat from overriding test users
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.email.endsWith('@example.com')) {
      logger.info(`[syncUserSubscriptionService] Bypassing sync for test user: ${userId}`);
      return getUserSubscriptionService(userId);
    }
    
    if (existingSub && existingSub.lastEventTimestamp && dto.lastEventTimestamp < Number(existingSub.lastEventTimestamp)) {
      logger.info(`[syncUserSubscriptionService] Ignoring older event for user: ${userId} (DB: ${existingSub.lastEventTimestamp}, RC: ${dto.lastEventTimestamp})`);
      return getUserSubscriptionService(userId);
    }

    let planId: string | null = null;
    if (dto.productId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { revenueCatProductId: dto.productId }
      });
      if (plan) {
        planId = plan.id;
      }
    }

    if (existingSub && existingSub.planId !== planId) {
      logger.info(`[syncUserSubscriptionService] Plan changed for user: ${userId} from ${existingSub.planId} to ${planId}`);
    }
    if (existingSub && existingSub.status !== dto.status) {
      logger.info(`[syncUserSubscriptionService] Status changed for user: ${userId} from ${existingSub.status} to ${dto.status}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.userSubscription.upsert({
        where: { userId },
        update: {
          status: dto.status as SubscriptionStatus,
          revenueCatCustomerId: dto.originalAppUserId,
          revenueCatProductId: dto.productId || 'none',
          entitlementId: dto.entitlementId || 'premium',
          purchasePlatform: dto.purchasePlatform as PurchasePlatform,
          purchaseDate: dto.purchaseDate || new Date(),
          expireDate: dto.expireDate,
          lastEventTimestamp: BigInt(dto.lastEventTimestamp),
          planId,
        },
        create: {
          userId,
          status: dto.status as SubscriptionStatus,
          revenueCatCustomerId: dto.originalAppUserId,
          revenueCatProductId: dto.productId || 'none',
          entitlementId: dto.entitlementId || 'premium',
          purchasePlatform: dto.purchasePlatform as PurchasePlatform,
          purchaseDate: dto.purchaseDate || new Date(),
          expireDate: dto.expireDate,
          lastEventTimestamp: BigInt(dto.lastEventTimestamp),
          planId,
        },
      });

      const isPremium = ['ACTIVE', 'GRACE_PERIOD', 'CANCELLED'].includes(dto.status);
      await tx.user.update({
        where: { id: userId },
        data: {
          isPremium,
          premiumUntil: dto.expireDate,
        },
      });
    });

    // Check if they have the Grace Token feature now
    const hasGraceToken = await userHasFeatureService(userId, 'ORCA_GRACE_TOKEN');
    if (hasGraceToken && dto.expireDate) {
      const expireDate = new Date(dto.expireDate);
      const existingToken = await prisma.orcaGraceToken.findUnique({
        where: { userId },
      });

      if (!existingToken) {
        await prisma.orcaGraceToken.create({
          data: {
            userId,
            resetsAt: expireDate,
          },
        });
      } else if (existingToken.resetsAt < expireDate) {
        await prisma.orcaGraceToken.update({
          where: { userId },
          data: {
            isUsed: false,
            usedAt: null,
            resetsAt: expireDate,
          },
        });
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info(`[syncUserSubscriptionService] SUBSCRIPTION_SYNC_COMPLETED for user: ${userId} in ${durationMs}ms`);
    return getUserSubscriptionService(userId);
  } catch (err) {
    logger.error(`[syncUserSubscriptionService] SYNC_FATAL_ERROR for user: ${userId}`, { err });
    throw err;
  } finally {
    await redis.del(lockKey);
  }
};

export const userHasFeatureService = async (
  userId: string,
  featureCode: string
): Promise<boolean> => {
  const userSub = await getUserSubscriptionService(userId);

  if (!userSub) {
    return false;
  }

  // Check if subscription is active
  if (userSub.status !== SubscriptionStatus.ACTIVE) {
    return false;
  }

  // Check if plan exists
  if (!userSub.plan) {
    return false;
  }

  const hasFeature = userSub.plan.features.some(
    (pf: any) => pf.feature.code === featureCode && pf.feature.isActive
  );

  return hasFeature;
};

// ==========================================
// Feature Services (Developer/Admin)
// ==========================================

export const getDeveloperFeaturesService = async () => {
  const features = await prisma.feature.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return features;
};

export const createFeatureService = async (payload: TCreateFeature) => {
  // Check if code already exists
  const existingFeature = await prisma.feature.findUnique({
    where: { code: payload.code },
  });

  if (existingFeature) {
    throw new Error('Feature code already exists');
  }

  const feature = await prisma.feature.create({
    data: payload,
  });

  return feature;
};

export const updateFeatureService = async (
  featureId: string,
  payload: TUpdateFeature
) => {
  const featureExists = await prisma.feature.findUnique({
    where: { id: featureId },
  });

  if (!featureExists) {
    throw new Error('Feature not found');
  }

  // Feature code cannot be updated (enforced in schema/controller, but just in case we remove it here)
  const { code, ...updatableFields } = payload as any;

  const feature = await prisma.feature.update({
    where: { id: featureId },
    data: updatableFields,
  });

  return feature;
};

// ==========================================
// Subscription Plan Services (Public/App/Dev)
// ==========================================

export const getActiveSubscriptionPlansService = async () => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true, isVisible: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      features: {
        include: {
          feature: true,
        },
      },
    },
  });

  return plans.map((plan: any) => ({
    ...plan,
    features: plan.features.map((pf: any) => pf.feature),
  }));
};

export const getDeveloperSubscriptionPlansService = async () => {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      features: {
        include: {
          feature: true,
        },
      },
    },
  });

  return plans.map((plan: any) => ({
    ...plan,
    features: plan.features.map((pf: any) => pf.feature),
  }));
};

export const getSingleDeveloperSubscriptionPlanService = async (planId: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
    include: {
      features: {
        include: {
          feature: true,
        },
      },
    },
  });

  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  return {
    ...plan,
    features: plan.features.map((pf: any) => pf.feature),
  };
};

export const createSubscriptionPlanService = async (
  payload: TCreateSubscriptionPlan
) => {
  const { featureIds, ...planData } = payload;
  
  const createdPlan = await prisma.subscriptionPlan.create({
    data: {
      ...planData,
      features: featureIds && featureIds.length > 0
        ? {
            create: featureIds.map((featureId: string) => ({
              feature: { connect: { id: featureId } },
            })),
          }
        : undefined,
    },
  });

  return createdPlan;
};

export const updateSubscriptionPlanService = async (
  planId: string,
  payload: TUpdateSubscriptionPlan
) => {
  const { featureIds, ...planData } = payload;

  const planExists = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!planExists) {
    throw new Error('Subscription plan not found');
  }

  const updatedPlan = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: {
      ...planData,
      ...(featureIds
        ? {
            features: {
              deleteMany: {}, // Remove existing feature links
              create: featureIds.map((featureId: string) => ({
                feature: { connect: { id: featureId } },
              })),
            },
          }
        : {}),
    },
  });

  return updatedPlan;
};
