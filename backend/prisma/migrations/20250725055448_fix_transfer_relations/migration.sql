/*
  Warnings:

  - Added the required column `saveGameId` to the `Transfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "saveGameId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "SaveGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
