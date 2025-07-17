-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "columnsMeta" JSONB,
ADD COLUMN     "sheetGroupId" INTEGER;

-- CreateTable
CREATE TABLE "SheetGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SheetGroup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_sheetGroupId_fkey" FOREIGN KEY ("sheetGroupId") REFERENCES "SheetGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
