import { SubscriptionFeature } from '@prisma/client';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';

export const retrieveSubscriptionFeaturesService = async (): Promise<
  SubscriptionFeature[]
> => {
  try {
    const redisClient=getRedisClient()
    const cachedSubscriptionFeatures=await redisClient.get('subscriptions:features');
    if(cachedSubscriptionFeatures){
      const data=JSON.parse(cachedSubscriptionFeatures) as SubscriptionFeature[];
      return data;
    }
    const data =await prisma.subscriptionFeature.findMany({where:{isActive:true}})
    return [];
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
