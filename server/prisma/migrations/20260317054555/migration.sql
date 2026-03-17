/*
  Warnings:

  - You are about to drop the `_EventToEventType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_EventToEventType" DROP CONSTRAINT "_EventToEventType_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventToEventType" DROP CONSTRAINT "_EventToEventType_B_fkey";

-- DropTable
DROP TABLE "_EventToEventType";

-- CreateTable
CREATE TABLE "EventEventType" (
    "eventId" TEXT NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEventType_pkey" PRIMARY KEY ("eventId","eventTypeId")
);

-- AddForeignKey
ALTER TABLE "EventEventType" ADD CONSTRAINT "EventEventType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEventType" ADD CONSTRAINT "EventEventType_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
