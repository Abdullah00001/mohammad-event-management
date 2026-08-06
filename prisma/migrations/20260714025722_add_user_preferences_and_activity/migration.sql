-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastInactivityReminder" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "inAppNotifications" BOOLEAN NOT NULL DEFAULT true;
