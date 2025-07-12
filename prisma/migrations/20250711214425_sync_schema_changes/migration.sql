/*
  Warnings:

  - Changed the type of `row` on the `SheetData` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "SheetData" DROP COLUMN "row",
ADD COLUMN     "row" JSONB NOT NULL;
