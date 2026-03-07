-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'VIEW_ONLY', 'HIBERNATED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('MANUAL', 'GOOGLE', 'APPLE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "provider" "Provider" NOT NULL DEFAULT 'MANUAL',
    "providerId" TEXT,
    "strikeCount" INTEGER NOT NULL DEFAULT 0,
    "penaltyEndDate" TIMESTAMP(3),
    "lastEventAttendedDate" TIMESTAMP(3),
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "gender" "Gender",
    "location" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "profileInterest" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryVisited" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "interestName" TEXT NOT NULL,
    "interestIcon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTraits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "energyScore" INTEGER NOT NULL,
    "curiosityScore" INTEGER NOT NULL,
    "rhythmScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTraits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushNotification" BOOLEAN NOT NULL DEFAULT false,
    "emailNotification" BOOLEAN NOT NULL DEFAULT false,
    "eventReminders" BOOLEAN NOT NULL DEFAULT false,
    "friendRequest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_interestName_key" ON "Interest"("interestName");

-- CreateIndex
CREATE INDEX "Interest_interestName_idx" ON "Interest"("interestName");

-- CreateIndex
CREATE UNIQUE INDEX "UserTraits_userId_key" ON "UserTraits"("userId");

-- CreateIndex
CREATE INDEX "UserTraits_energyScore_curiosityScore_rhythmScore_idx" ON "UserTraits"("energyScore", "curiosityScore", "rhythmScore");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTraits" ADD CONSTRAINT "UserTraits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
