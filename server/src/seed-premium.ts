import 'dotenv/config';
import { PrismaClient, SubscriptionStatus, PurchasePlatform } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'premium2@example.com';
  
  let user = await prisma.user.findUnique({ where: { email } });
  
  const profileData = {
    name: 'Mohammad Alas',
    age: 24,
    gender: 'MALE' as any,
    location: 'Dhaka,Bangladesh',
    bio: "I am 24 year's old",
    profileInterest: ['e2ed9572-54f8-49e4-8aa5-e9774e86da35'],
  };

  const traitsData = {
    energyScore: 8,
    curiosityScore: 7,
    rhythmScore: 5,
  };

  if (!user) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isVerified: true,
        isPremium: true,
        isProfileSetup: true,
        premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        profile: {
          create: profileData,
        },
        userPreference: {
          create: {},
        },
        userTraits: {
          create: traitsData,
        },
      }
    });
    console.log(`Created new premium user: ${user.email} (password: password123)`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isPremium: true,
        isProfileSetup: true,
        premiumUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        profile: {
          upsert: {
            create: profileData,
            update: profileData,
          }
        },
        userTraits: {
          upsert: {
            create: traitsData,
            update: traitsData,
          }
        }
      }
    });
    console.log(`Updated existing user to premium: ${user.email}`);
  }

  // Find a plan
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { entitlementId: 'premium' }
  });

  if (plan) {
    await prisma.userSubscription.upsert({
      where: { revenueCatCustomerId: user.id },
      update: {
        status: SubscriptionStatus.ACTIVE,
        planId: plan.id,
        purchasePlatform: PurchasePlatform.APPLE,
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user.id,
        planId: plan.id,
        revenueCatCustomerId: user.id, // we use user ID as RC customer ID usually
        revenueCatProductId: plan.revenueCatProductId,
        entitlementId: plan.entitlementId,
        purchasePlatform: PurchasePlatform.APPLE,
        status: SubscriptionStatus.ACTIVE,
        purchaseDate: new Date(),
        expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });
    console.log(`Assigned subscription plan '${plan.name}' to user.`);
  } else {
    console.log('No subscription plan found to link.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
