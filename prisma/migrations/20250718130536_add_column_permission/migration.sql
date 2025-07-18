-- CreateTable
CREATE TABLE "ColumnPermission" (
    "id" SERIAL NOT NULL,
    "userSheetId" INTEGER NOT NULL,
    "columnName" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL,

    CONSTRAINT "ColumnPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColumnPermission_userSheetId_columnName_key" ON "ColumnPermission"("userSheetId", "columnName");

-- AddForeignKey
ALTER TABLE "ColumnPermission" ADD CONSTRAINT "ColumnPermission_userSheetId_fkey" FOREIGN KEY ("userSheetId") REFERENCES "UserSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
