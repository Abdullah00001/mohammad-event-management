-- AlterTable
ALTER TABLE "UserPreference" ALTER COLUMN "pushNotification" SET DEFAULT true,
ALTER COLUMN "emailNotification" SET DEFAULT true,
ALTER COLUMN "eventReminders" SET DEFAULT true,
ALTER COLUMN "friendRequest" SET DEFAULT true;
