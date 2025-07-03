-- AlterTable
ALTER TABLE "UserSheet" ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
