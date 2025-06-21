/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Sheet` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Sheet` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SheetData` table. All the data in the column will be lost.
  - You are about to drop the column `spreadsheetId` on the `SheetData` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SheetData` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[spreadsheet_id,position]` on the table `SheetData` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `spreadsheet_id` to the `SheetData` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SheetData" DROP CONSTRAINT "SheetData_spreadsheetId_fkey";

-- DropIndex
DROP INDEX "SheetData_spreadsheetId_position_key";

-- AlterTable
ALTER TABLE "Sheet" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SheetData" DROP COLUMN "createdAt",
DROP COLUMN "spreadsheetId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "spreadsheet_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "subject" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_user_id_permission_id_key" ON "UserPermission"("user_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "SheetData_spreadsheet_id_position_key" ON "SheetData"("spreadsheet_id", "position");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetData" ADD CONSTRAINT "SheetData_spreadsheet_id_fkey" FOREIGN KEY ("spreadsheet_id") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
