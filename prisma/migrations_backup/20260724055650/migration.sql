/*
  Warnings:

  - You are about to drop the column `inviteLink` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the `PodInvite` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[inviteToken]` on the table `Event` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PurchasePlatform" AS ENUM ('APPLE', 'GOOGLE', 'WEB');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'GRACE_PERIOD';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';

-- DropForeignKey
ALTER TABLE "PodInvite" DROP CONSTRAINT "PodInvite_eventId_fkey";

-- DropForeignKey
ALTER TABLE "PodInvite" DROP CONSTRAINT "PodInvite_inviteeId_fkey";

-- DropIndex
DROP INDEX "Event_inviteLink_key";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "inviteLink",
ADD COLUMN     "inviteToken" TEXT;

-- DropTable
DROP TABLE "PodInvite";

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "marketingDescription" TEXT,
    "badge" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revenueCatProductId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("planId","featureId")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "revenueCatCustomerId" TEXT NOT NULL,
    "revenueCatProductId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "purchasePlatform" "PurchasePlatform" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "expireDate" TIMESTAMP(3),
    "lastEventTimestamp" BIGINT DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RevenueCatEvent" (
    "id" TEXT NOT NULL,
    "revenueCatEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueCatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_revenueCatProductId_key" ON "SubscriptionPlan"("revenueCatProductId");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_isVisible_displayOrder_idx" ON "SubscriptionPlan"("isActive", "isVisible", "displayOrder");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_entitlementId_idx" ON "SubscriptionPlan"("entitlementId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_code_key" ON "Feature"("code");

-- CreateIndex
CREATE INDEX "Feature_isActive_idx" ON "Feature"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_revenueCatCustomerId_key" ON "UserSubscription"("revenueCatCustomerId");

-- CreateIndex
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");

-- CreateIndex
CREATE INDEX "UserSubscription_expireDate_idx" ON "UserSubscription"("expireDate");

-- CreateIndex
CREATE INDEX "UserSubscription_entitlementId_idx" ON "UserSubscription"("entitlementId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueCatEvent_revenueCatEventId_key" ON "RevenueCatEvent"("revenueCatEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_inviteToken_key" ON "Event"("inviteToken");

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
