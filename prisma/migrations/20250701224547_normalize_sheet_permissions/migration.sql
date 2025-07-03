/*
  Warnings:

  - You are about to drop the column `permissions` on the `UserSheet` table. All the data in the column will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SheetPermissionType" AS ENUM ('addColumn', 'deleteColumn', 'updateColumn', 'addRow', 'deleteRow', 'updateRow');

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "UserPermission" DROP CONSTRAINT "UserPermission_userId_fkey";

-- AlterTable
ALTER TABLE "UserSheet" DROP COLUMN "permissions";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "UserPermission";

-- CreateTable
CREATE TABLE "SheetPermission" (
    "id" SERIAL NOT NULL,
    "userSheetId" INTEGER NOT NULL,
    "type" "SheetPermissionType" NOT NULL,

    CONSTRAINT "SheetPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SheetPermission_userSheetId_type_key" ON "SheetPermission"("userSheetId", "type");

-- AddForeignKey
ALTER TABLE "SheetPermission" ADD CONSTRAINT "SheetPermission_userSheetId_fkey" FOREIGN KEY ("userSheetId") REFERENCES "UserSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
