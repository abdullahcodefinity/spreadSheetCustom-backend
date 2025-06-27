/*
  Warnings:

  - You are about to drop the column `created_at` on the `Sheet` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `Sheet` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `SheetData` table. All the data in the column will be lost.
  - You are about to drop the column `spreadsheet_id` on the `SheetData` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `SheetData` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `permission_id` on the `UserPermission` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `UserPermission` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[spreadsheetId,position]` on the table `SheetData` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,permissionId]` on the table `UserPermission` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `spreadsheetId` to the `SheetData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permissionId` to the `UserPermission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserPermission` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SheetData" DROP CONSTRAINT "SheetData_spreadsheet_id_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_user_id_fkey";

-- DropIndex
DROP INDEX "SheetData_spreadsheet_id_position_key";

-- DropIndex
DROP INDEX "UserPermission_user_id_permission_id_key";

-- AlterTable
ALTER TABLE "Sheet" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SheetData" DROP COLUMN "created_at",
DROP COLUMN "spreadsheet_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "spreadsheetId" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "UserPermission" DROP COLUMN "permission_id",
DROP COLUMN "user_id",
ADD COLUMN     "permissionId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "UserSheet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "UserSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueSet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],

    CONSTRAINT "ValueSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSheet_userId_sheetId_key" ON "UserSheet"("userId", "sheetId");

-- CreateIndex
CREATE UNIQUE INDEX "SheetData_spreadsheetId_position_key" ON "SheetData"("spreadsheetId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");

-- AddForeignKey
ALTER TABLE "UserSheet" ADD CONSTRAINT "UserSheet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSheet" ADD CONSTRAINT "UserSheet_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetData" ADD CONSTRAINT "SheetData_spreadsheetId_fkey" FOREIGN KEY ("spreadsheetId") REFERENCES "Sheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
