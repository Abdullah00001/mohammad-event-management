/*
  Warnings:

  - Made the column `maxParticipantsCount` on table `Event` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "maxParticipantsCount" SET NOT NULL,
ALTER COLUMN "maxParticipantsCount" SET DEFAULT 10;
