-- AlterTable
ALTER TABLE "EventMessage" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];
