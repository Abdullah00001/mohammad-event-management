/*
  Warnings:

  - A unique constraint covering the columns `[eventId,participantId]` on the table `EventParticipants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "maxParticipantsCount" DROP NOT NULL,
ALTER COLUMN "maxParticipantsCount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastStrikeDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Strike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" "StrikeReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Strike_userId_idx" ON "Strike"("userId");

-- CreateIndex
CREATE INDEX "Strike_createdAt_idx" ON "Strike"("createdAt");

-- CreateIndex
CREATE INDEX "ConversationSettings_userId_idx" ON "ConversationSettings"("userId");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Event_lat_long_idx" ON "Event"("lat", "long");

-- CreateIndex
CREATE INDEX "Event_startDate_idx" ON "Event"("startDate");

-- CreateIndex
CREATE INDEX "Event_eventStatus_idx" ON "Event"("eventStatus");

-- CreateIndex
CREATE INDEX "Event_isPrivate_idx" ON "Event"("isPrivate");

-- CreateIndex
CREATE INDEX "EventMessage_deletedAt_idx" ON "EventMessage"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventParticipants_eventId_participantId_key" ON "EventParticipants"("eventId", "participantId");

-- CreateIndex
CREATE INDEX "Message_deletedAt_idx" ON "Message"("deletedAt");

-- CreateIndex
CREATE INDEX "OrcaGraceToken_userId_resetsAt_idx" ON "OrcaGraceToken"("userId", "resetsAt");

-- CreateIndex
CREATE INDEX "User_strikeCount_idx" ON "User"("strikeCount");

-- CreateIndex
CREATE INDEX "User_penaltyEndDate_idx" ON "User"("penaltyEndDate");

-- CreateIndex
CREATE INDEX "WaitList_eventId_joinedAt_idx" ON "WaitList"("eventId", "joinedAt");

-- AddForeignKey
ALTER TABLE "Strike" ADD CONSTRAINT "Strike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
