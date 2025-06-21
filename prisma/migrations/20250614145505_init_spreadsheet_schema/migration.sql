/*
  Warnings:

  - You are about to drop the column `data` on the `SheetData` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Sheet" ALTER COLUMN "columns" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SheetData" DROP COLUMN "data",
ADD COLUMN     "row" TEXT[];
