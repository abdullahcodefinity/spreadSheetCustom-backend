-- CreateTable
CREATE TABLE "ColumnDropdown" (
    "id" SERIAL NOT NULL,
    "columnName" TEXT NOT NULL,
    "sheetId" INTEGER NOT NULL,
    "valueSetId" INTEGER NOT NULL,

    CONSTRAINT "ColumnDropdown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnDropdown_sheetId_columnName_key" ON "ColumnDropdown"("sheetId", "columnName");

-- AddForeignKey
ALTER TABLE "ColumnDropdown" ADD CONSTRAINT "ColumnDropdown_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColumnDropdown" ADD CONSTRAINT "ColumnDropdown_valueSetId_fkey" FOREIGN KEY ("valueSetId") REFERENCES "ValueSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
