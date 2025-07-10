/*
  Warnings:

  - The `matchdayType` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `gameStage` column on the `GameState` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `currentSaveGameId` to the `GameState` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Matchday` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MatchdayType" AS ENUM ('LEAGUE', 'CUP');

-- CreateEnum
CREATE TYPE "GameStage" AS ENUM ('ACTION', 'MATCHDAY', 'HALFTIME', 'RESULTS', 'STANDINGS');

-- AlterTable
ALTER TABLE "GameState" ADD COLUMN     "currentSaveGameId" INTEGER NOT NULL,
DROP COLUMN "matchdayType",
ADD COLUMN     "matchdayType" "MatchdayType" NOT NULL DEFAULT 'LEAGUE',
DROP COLUMN "gameStage",
ADD COLUMN     "gameStage" "GameStage" NOT NULL DEFAULT 'ACTION';

-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "saveGameMatchId" INTEGER;

-- AlterTable
ALTER TABLE "Matchday" DROP COLUMN "type",
ADD COLUMN     "type" "MatchdayType" NOT NULL;

-- AlterTable
ALTER TABLE "SaveGameMatch" ADD COLUMN     "matchdayId" INTEGER;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_saveGameMatchId_fkey" FOREIGN KEY ("saveGameMatchId") REFERENCES "SaveGameMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGamePlayer" ADD CONSTRAINT "SaveGamePlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SaveGameTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGameMatch" ADD CONSTRAINT "SaveGameMatch_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGameMatch" ADD CONSTRAINT "SaveGameMatch_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGameMatch" ADD CONSTRAINT "SaveGameMatch_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "Matchday"("id") ON DELETE SET NULL ON UPDATE CASCADE;
