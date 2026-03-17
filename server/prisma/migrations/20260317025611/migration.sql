-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Interest" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
