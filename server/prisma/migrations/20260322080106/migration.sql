/*
  Warnings:

  - The values [CANCELLED] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `features` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `autoRenew` on the `UserSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `UserSubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[subscriptionId]` on the table `OrcaGraceToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subscriptionId` to the `OrcaGraceToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'PAYMENT_FAILED');
ALTER TABLE "public"."UserSubscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserSubscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "public"."SubscriptionStatus_old";
ALTER TABLE "UserSubscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropIndex
DROP INDEX "SubscriptionPlan_isActive_idx";

-- AlterTable
ALTER TABLE "OrcaGraceToken" ADD COLUMN     "subscriptionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "features";

-- AlterTable
ALTER TABLE "UserSubscription" DROP COLUMN "autoRenew",
DROP COLUMN "cancelledAt";

-- CreateTable
CREATE TABLE "SubscriptionFeature" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "featureTitle" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlanFeature" (
    "planId" TEXT NOT NULL,
    "subscriptionFeatureId" TEXT NOT NULL,

    CONSTRAINT "SubscriptionPlanFeature_pkey" PRIMARY KEY ("planId","subscriptionFeatureId")
);

-- CreateTable
CREATE TABLE "UserActiveFeature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionFeatureId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,

    CONSTRAINT "UserActiveFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionFeature_featureKey_key" ON "SubscriptionFeature"("featureKey");

-- CreateIndex
CREATE INDEX "SubscriptionFeature_featureKey_idx" ON "SubscriptionFeature"("featureKey");

-- CreateIndex
CREATE INDEX "SubscriptionFeature_isActive_idx" ON "SubscriptionFeature"("isActive");

-- CreateIndex
CREATE INDEX "SubscriptionPlanFeature_planId_idx" ON "SubscriptionPlanFeature"("planId");

-- CreateIndex
CREATE INDEX "UserActiveFeature_userId_idx" ON "UserActiveFeature"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserActiveFeature_userId_subscriptionFeatureId_key" ON "UserActiveFeature"("userId", "subscriptionFeatureId");

-- CreateIndex
CREATE UNIQUE INDEX "OrcaGraceToken_subscriptionId_key" ON "OrcaGraceToken"("subscriptionId");

-- AddForeignKey
ALTER TABLE "SubscriptionPlanFeature" ADD CONSTRAINT "SubscriptionPlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlanFeature" ADD CONSTRAINT "SubscriptionPlanFeature_subscriptionFeatureId_fkey" FOREIGN KEY ("subscriptionFeatureId") REFERENCES "SubscriptionFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActiveFeature" ADD CONSTRAINT "UserActiveFeature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActiveFeature" ADD CONSTRAINT "UserActiveFeature_subscriptionFeatureId_fkey" FOREIGN KEY ("subscriptionFeatureId") REFERENCES "SubscriptionFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActiveFeature" ADD CONSTRAINT "UserActiveFeature_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcaGraceToken" ADD CONSTRAINT "OrcaGraceToken_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
