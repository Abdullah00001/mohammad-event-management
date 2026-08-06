/*
  Warnings:

  - You are about to drop the column `endTime` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `long` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `travelCityLong` on the `UserTravelMode` table. All the data in the column will be lost.
  - Added the required column `endDate` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Event_lat_long_idx";

-- DropIndex
DROP INDEX "Event_startDate_idx";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "endTime",
DROP COLUMN "long",
DROP COLUMN "startTime",
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lng" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "UserTravelMode" DROP COLUMN "travelCityLong",
ADD COLUMN     "travelCityLng" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Event_lat_lng_idx" ON "Event"("lat", "lng");

-- CreateIndex
CREATE INDEX "Event_startDate_endDate_idx" ON "Event"("startDate", "endDate");
