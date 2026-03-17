/*
  Warnings:

  - You are about to drop the column `endAt` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `startAt` on the `Event` table. All the data in the column will be lost.
  - Added the required column `date` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "endAt",
DROP COLUMN "startAt",
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "time" TEXT NOT NULL;
