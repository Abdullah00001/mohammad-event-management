/*
  Warnings:

  - The values [REJECTED] on the enum `KycStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "KycStatus_new" AS ENUM ('VERIFIED', 'PENDING', 'UNVERIFIED');
ALTER TABLE "public"."User" ALTER COLUMN "kycStatus" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "kycStatus" TYPE "KycStatus_new" USING ("kycStatus"::text::"KycStatus_new");
ALTER TYPE "KycStatus" RENAME TO "KycStatus_old";
ALTER TYPE "KycStatus_new" RENAME TO "KycStatus";
DROP TYPE "public"."KycStatus_old";
ALTER TABLE "User" ALTER COLUMN "kycStatus" SET DEFAULT 'UNVERIFIED';
COMMIT;
