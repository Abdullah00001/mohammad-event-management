/*
  Warnings:

  - You are about to drop the column `kycStatus` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "KycAttemptStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'ABANDONED', 'REVIEW');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "kycStatus";

-- DropEnum
DROP TYPE "KycStatus";

-- CreateTable
CREATE TABLE "KycAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workflowId" TEXT,
    "status" "KycAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "environment" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedUserData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "dob" TIMESTAMP(3),
    "documentNumber" TEXT,
    "documentType" TEXT,
    "nationality" TEXT,
    "gender" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerifiedUserData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycAttempt_sessionId_key" ON "KycAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "KycAttempt_userId_idx" ON "KycAttempt"("userId");

-- CreateIndex
CREATE INDEX "KycAttempt_sessionId_idx" ON "KycAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "KycAttempt_status_idx" ON "KycAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedUserData_userId_key" ON "VerifiedUserData"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedUserData_attemptId_key" ON "VerifiedUserData"("attemptId");

-- CreateIndex
CREATE INDEX "VerifiedUserData_userId_idx" ON "VerifiedUserData"("userId");

-- AddForeignKey
ALTER TABLE "KycAttempt" ADD CONSTRAINT "KycAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedUserData" ADD CONSTRAINT "VerifiedUserData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedUserData" ADD CONSTRAINT "VerifiedUserData_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "KycAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
