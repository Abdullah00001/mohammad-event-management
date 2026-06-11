/*
  Warnings:

  - You are about to drop the column `cancelledAt` on the `EventParticipants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventParticipants" DROP COLUMN "cancelledAt",
ADD COLUMN     "leftAt" TIMESTAMP(3);
