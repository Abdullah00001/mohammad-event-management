import {
  PaymentStatus,
  PlanChangeType,
  SubscriptionFeature,
  SubscriptionPlan,
  SubscriptionStatus,
  User,
} from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';
import Stripe from 'stripe';

import prisma from '@/app/configs/db.configs';
import { getRedisClient } from '@/app/configs/redis.config';
import stripeService from '@/app/configs/stripe.configs';
import { SubscriptionPlanDTO } from '@/app/modules/subscription/subscription.dto';
import { TPlan } from '@/app/modules/subscription/subscription.schemas';
import { expiresInTimeUnitToMs } from '@/app/utils/system.utils';
import { SUBSCRIPTION_FEATURE_CACHE_EXPIRY } from '@/const';
import { env } from '@/env';

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
    const plan = await prisma.$transaction(async (tx) => {
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
      return plan;
    });
    const { stripePriceId, stripeProductId } =
      await stripeService.createProductAndPrice(
        plan.id,
        plan.title,
        plan.price,
        plan.currency,
        plan.intervalDays
      );

    await prisma.$transaction([
      prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { stripeProductId, stripePriceId },
      }),
      prisma.subscriptionPlanHistory.create({
        data: {
          planId: plan.id,
          snapshot: { ...plan, stripeProductId, stripePriceId },
          changeType: PlanChangeType.CREATED,
          changedById: user.id,
        },
      }),
    ]);
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
  plan,
}: {
  plan: SubscriptionPlan;
}): Promise<SubscriptionPlanDTO | null> => {
  try {
    const foundedPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        id: plan.id,
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

    if (!foundedPlan) return null;

    return SubscriptionPlanDTO.fromEntity(foundedPlan);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in retrieve subscription plan service'
    );
  }
};

export const updateSubscriptionPlanService = async ({
  plan,
  requestBodyPayload,
  user,
}: {
  plan: SubscriptionPlan;
  requestBodyPayload: TPlan;
  user: JwtPayload;
}): Promise<void> => {
  const { duration, features, price, title } = requestBodyPayload;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscriptionPlan.update({
        where: { id: plan.id },
        data: {
          title,
          price,
          intervalDays: duration,
        },
      });
      await tx.subscriptionPlanFeature.deleteMany({
        where: { planId: plan.id },
      });

      await tx.subscriptionPlanFeature.createMany({
        data: features.map((featureId) => ({
          planId: plan.id,
          subscriptionFeatureId: featureId,
        })),
      });
    });
    if (plan.stripePriceId && plan.stripeProductId) {
      await stripeService.updateProduct(plan.stripeProductId, title);

      const priceChanged = plan.price !== price;
      const intervalChanged = plan.intervalDays !== duration;

      if (priceChanged || intervalChanged) {
        const { stripePriceId: newPriceId } =
          await stripeService.rotatePriceOnPlan(
            plan.stripeProductId,
            plan.stripePriceId,
            price,
            plan.currency,
            duration
          );
        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: { stripePriceId: newPriceId },
        });
      }
    } else {
      const { stripeProductId, stripePriceId } =
        await stripeService.createProductAndPrice(
          plan.id,
          title,
          price,
          plan.currency,
          duration
        );
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { stripeProductId, stripePriceId },
      });
    }
    await prisma.subscriptionPlanHistory.create({
      data: {
        planId: plan.id,
        snapshot: { ...plan, title, price, intervalDays: duration },
        changeType: PlanChangeType.UPDATED,
        changedById: user.sub as string,
      },
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
  plan,
  user,
}: {
  plan: SubscriptionPlan;
  user: JwtPayload;
}): Promise<void> => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscriptionPlan.update({
        where: { id: plan.id },
        data: { deletedAt: new Date(), isActive: false },
      });
      await tx.subscriptionPlanHistory.create({
        data: {
          planId: plan.id,
          snapshot: { ...plan },
          changeType: PlanChangeType.DELETED,
          changedById: user.sub as string,
        },
      });
    });

    return;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(
      'Unknown error occurred in delete subscription plan service'
    );
  }
};

// ─── Intent Service ───────────────────────────────────────────────

export const stripePaymentIntentService = async ({
  user,
  plan,
}: {
  user: User;
  plan: SubscriptionPlan;
}): Promise<{ clientSecret: string }> => {
  try {
    // 1. Ensure the plan has a Stripe price
    if (!plan.stripePriceId) {
      throw new Error('Plan is not configured for payment');
    }

    // 2. Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripeService.createCustomer(
        user.email,
        undefined,
        user.id
      );
      stripeCustomerId = customer!.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    }

    // 3. Create incomplete Stripe subscription → returns clientSecret for Flutter
    const { clientSecret } = await stripeService.createSubscription(
      stripeCustomerId,
      plan.stripePriceId,
      user.id,
      plan.id
    );

    return { clientSecret };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Unknown error occurred in stripe payment intent service');
  }
};

// ─── Webhook Service ──────────────────────────────────────────────

export const stripeWebhookService = async (
  payload: Buffer,
  signature: string
): Promise<void> => {
  let event: Stripe.Event;

  try {
    event = stripeService.constructWebhookEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw new Error('Webhook signature verification failed');
  }

  switch (event.type) {
    // Payment succeeded → activate subscription
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription: string | null;
        period_start: number;
        period_end: number;
        payment_intent: string | null;
      };

      if (!invoice.subscription) break;

      const stripeSubscriptionId = invoice.subscription;

      const stripeSub = await stripeService
        .getStripe()
        .subscriptions.retrieve(stripeSubscriptionId);

      const internalUserId = stripeSub.metadata?.internalUserId;
      const internalPlanId = stripeSub.metadata?.internalPlanId;

      if (!internalUserId || !internalPlanId) break;

      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: internalPlanId },
        include: { planFeatures: { include: { feature: true } } },
      });

      if (!plan) break;

      const startDate = new Date(invoice.period_start * 1000);
      const endDate = new Date(invoice.period_end * 1000);

      await prisma.$transaction(async (tx) => {
        // Create UserSubscription record
        const subscription = await tx.userSubscription.create({
          data: {
            userId: internalUserId,
            planId: internalPlanId,
            planSnapshot: plan,
            status: SubscriptionStatus.ACTIVE,
            startDate,
            endDate,
            stripeSubscriptionId,
          },
        });

        // Activate features for the user
        await tx.userActiveFeature.createMany({
          data: plan.planFeatures.map((pf) => ({
            userId: internalUserId,
            subscriptionFeatureId: pf.subscriptionFeatureId,
            subscriptionId: subscription.id,
          })),
          skipDuplicates: true,
        });

        // Mark user as premium
        await tx.user.update({
          where: { id: internalUserId },
          data: { isPremium: true, premiumUntil: endDate },
        });

        // Log payment transaction
        await tx.paymentTransaction.create({
          data: {
            subscriptionId: subscription.id,
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency,
            status: PaymentStatus.SUCCESS,
            gateway: 'stripe',
            gatewayTxId: invoice.payment_intent as string,
            gatewayPayload: invoice as object,
            paidAt: new Date(),
          },
        });
      });

      break;
    }

    // Payment failed
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription: string | null;
        payment_intent: string | null;
      };

      if (!invoice.subscription) break;

      const stripeSubscriptionId = invoice.subscription as string;
      const existingSub = await prisma.userSubscription.findFirst({
        where: { stripeSubscriptionId },
      });

      if (!existingSub) break;

      await prisma.$transaction([
        prisma.userSubscription.update({
          where: { id: existingSub.id },
          data: { status: SubscriptionStatus.PAYMENT_FAILED },
        }),
        prisma.paymentTransaction.create({
          data: {
            subscriptionId: existingSub.id,
            amount: (invoice.amount_due ?? 0) / 100,
            currency: invoice.currency,
            status: PaymentStatus.FAILED,
            gateway: 'stripe',
            gatewayTxId: (invoice.payment_intent as string) ?? null,
            gatewayPayload: invoice as object,
            failureReason:
              invoice.last_finalization_error?.message ?? 'Payment failed',
          },
        }),
      ]);

      break;
    }

    default:
      // Unhandled event — ignore
      break;
  }
};
