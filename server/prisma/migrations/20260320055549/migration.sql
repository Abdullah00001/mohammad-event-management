/*
  Warnings:

  - You are about to drop the column `activityTypes` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "activityTypes",
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[];
