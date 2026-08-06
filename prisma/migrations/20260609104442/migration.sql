/*
  Warnings:

  - You are about to drop the column `journalNoShow` on the `EventParticipants` table. All the data in the column will be lost.
  - You are about to drop the column `journalRating` on the `EventParticipants` table. All the data in the column will be lost.
  - You are about to drop the column `journalSubmitted` on the `EventParticipants` table. All the data in the column will be lost.
  - You are about to drop the column `journalSubmittedAt` on the `EventParticipants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventParticipants" DROP COLUMN "journalNoShow",
DROP COLUMN "journalRating",
DROP COLUMN "journalSubmitted",
DROP COLUMN "journalSubmittedAt",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "noShow" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EventRating" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventRating_eventId_ratedUserId_idx" ON "EventRating"("eventId", "ratedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRating_eventId_raterId_ratedUserId_key" ON "EventRating"("eventId", "raterId", "ratedUserId");

-- AddForeignKey
ALTER TABLE "EventRating" ADD CONSTRAINT "EventRating_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRating" ADD CONSTRAINT "EventRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRating" ADD CONSTRAINT "EventRating_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
