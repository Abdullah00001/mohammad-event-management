import { SubscriptionFeature } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
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
}: {
  requestBodyPayload: unknown;
}): Promise<void> => {
  try {
    console.log(requestBodyPayload);
    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in create subscription plan service'
    );
  }
};
