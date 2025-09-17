/*
  Warnings:

  - A unique constraint covering the columns `[coachTeamId]` on the table `SaveGame` will be added. If there are existing duplicate values, this will fail.
  - Made the column `localIndex` on table `SaveGameTeam` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "SaveGameTeam" DROP CONSTRAINT "SaveGameTeam_saveGameId_fkey";

-- AlterTable
ALTER TABLE "SaveGame" ADD COLUMN     "coachTeamId" INTEGER;

-- AlterTable
ALTER TABLE "SaveGameTeam" ALTER COLUMN "currentSeason" DROP DEFAULT,
ALTER COLUMN "localIndex" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SaveGame_coachTeamId_key" ON "SaveGame"("coachTeamId");

-- CreateIndex
CREATE INDEX "SaveGame_coachTeamId_idx" ON "SaveGame"("coachTeamId");

-- AddForeignKey
ALTER TABLE "SaveGame" ADD CONSTRAINT "SaveGame_coachTeamId_fkey" FOREIGN KEY ("coachTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGameTeam" ADD CONSTRAINT "SaveGameTeam_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "SaveGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
