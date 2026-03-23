/*
  Warnings:

  - You are about to alter the column `featureTitle` on the `SubscriptionFeature` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(48)`.
  - Added the required column `featureDescription` to the `SubscriptionFeature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubscriptionFeature" ADD COLUMN     "featureDescription" VARCHAR(180) NOT NULL,
ALTER COLUMN "featureTitle" SET DATA TYPE VARCHAR(48);
