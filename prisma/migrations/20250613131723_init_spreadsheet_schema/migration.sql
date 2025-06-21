/*
  Warnings:

  - You are about to drop the `Cell` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sheet` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cell" DROP CONSTRAINT "Cell_sheetId_fkey";

-- DropTable
DROP TABLE "Cell";

-- DropTable
DROP TABLE "Sheet";

-- CreateTable
CREATE TABLE "Spreadsheet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spreadsheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Column" (
    "id" SERIAL NOT NULL,
    "spreadsheetId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Column_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Row" (
    "id" SERIAL NOT NULL,
    "spreadsheetId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Row_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Column_spreadsheetId_position_key" ON "Column"("spreadsheetId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Column_spreadsheetId_name_key" ON "Column"("spreadsheetId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Row_spreadsheetId_position_key" ON "Row"("spreadsheetId", "position");

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_spreadsheetId_fkey" FOREIGN KEY ("spreadsheetId") REFERENCES "Spreadsheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Row" ADD CONSTRAINT "Row_spreadsheetId_fkey" FOREIGN KEY ("spreadsheetId") REFERENCES "Spreadsheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
