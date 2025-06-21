/*
  Warnings:

  - You are about to drop the `Column` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Row` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Spreadsheet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_spreadsheetId_fkey";

-- DropForeignKey
ALTER TABLE "Row" DROP CONSTRAINT "Row_spreadsheetId_fkey";

-- DropTable
DROP TABLE "Column";

-- DropTable
DROP TABLE "Row";

-- DropTable
DROP TABLE "Spreadsheet";

-- CreateTable
CREATE TABLE "Sheet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "columns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SheetData" (
    "id" SERIAL NOT NULL,
    "spreadsheetId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheetData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SheetData_spreadsheetId_position_key" ON "SheetData"("spreadsheetId", "position");

-- AddForeignKey
ALTER TABLE "SheetData" ADD CONSTRAINT "SheetData_spreadsheetId_fkey" FOREIGN KEY ("spreadsheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
