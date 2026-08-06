/*
  Warnings:

  - You are about to drop the column `userAId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `userBId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the `EventMessage` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[eventId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PRIVATE', 'GROUP');

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userAId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userBId_fkey";

-- DropForeignKey
ALTER TABLE "EventMessage" DROP CONSTRAINT "EventMessage_eventId_fkey";

-- DropForeignKey
ALTER TABLE "EventMessage" DROP CONSTRAINT "EventMessage_senderId_fkey";

-- DropIndex
DROP INDEX "Conversation_userAId_idx";

-- DropIndex
DROP INDEX "Conversation_userAId_userBId_key";

-- DropIndex
DROP INDEX "Conversation_userBId_idx";

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "userAId",
DROP COLUMN "userBId",
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "type" "ConversationType" NOT NULL DEFAULT 'PRIVATE';

-- DropTable
DROP TABLE "EventMessage";

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_eventId_key" ON "Conversation"("eventId");

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

-- CreateIndex
CREATE INDEX "Conversation_eventId_idx" ON "Conversation"("eventId");

-- CreateIndex
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
