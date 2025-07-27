/*
  Warnings:

  - Added the required column `saveGameId` to the `Matchday` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Matchday" ADD COLUMN     "saveGameId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Matchday" ADD CONSTRAINT "Matchday_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "SaveGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
