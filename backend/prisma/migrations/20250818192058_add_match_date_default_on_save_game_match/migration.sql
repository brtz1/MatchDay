/*
  Warnings:

  - You are about to drop the column `eventType` on the `MatchEvent` table. All the data in the column will be lost.
  - You are about to drop the column `matchId` on the `MatchState` table. All the data in the column will be lost.
  - You are about to drop the column `matchDate` on the `SaveGameMatch` table. All the data in the column will be lost.
  - You are about to drop the column `matchdayType` on the `SaveGameMatch` table. All the data in the column will be lost.
  - You are about to drop the column `played` on the `SaveGameMatch` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[saveGameMatchId]` on the table `MatchState` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `MatchEvent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saveGameMatchId` to the `MatchState` table without a default value. This is not possible if the table is not empty.
  - Made the column `awayFormation` on table `MatchState` required. This step will fail if there are existing NULL values in that column.
  - Made the column `homeFormation` on table `MatchState` required. This step will fail if there are existing NULL values in that column.
  - Made the column `matchdayId` on table `SaveGameMatch` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('GOAL', 'RED', 'INJURY');

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_matchdayId_fkey";

-- DropForeignKey
ALTER TABLE "MatchState" DROP CONSTRAINT "MatchState_matchId_fkey";

-- DropForeignKey
ALTER TABLE "SaveGameMatch" DROP CONSTRAINT "SaveGameMatch_matchdayId_fkey";

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_fromTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_playerId_fkey";

-- DropForeignKey
ALTER TABLE "Transfer" DROP CONSTRAINT "Transfer_toTeamId_fkey";

-- DropIndex
DROP INDEX "MatchState_matchId_key";

-- AlterTable
ALTER TABLE "MatchEvent" DROP COLUMN "eventType",
ADD COLUMN     "type" "MatchEventType" NOT NULL,
ALTER COLUMN "matchdayId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MatchState" DROP COLUMN "matchId",
ADD COLUMN     "saveGameMatchId" INTEGER NOT NULL,
ADD COLUMN     "subsRemainingAway" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "subsRemainingHome" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "homeLineup" SET DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "awayLineup" SET DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "homeReserves" SET DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "awayReserves" SET DEFAULT ARRAY[]::INTEGER[],
ALTER COLUMN "awayFormation" SET NOT NULL,
ALTER COLUMN "awayFormation" SET DEFAULT '',
ALTER COLUMN "homeFormation" SET NOT NULL,
ALTER COLUMN "homeFormation" SET DEFAULT '';

-- AlterTable
ALTER TABLE "SaveGameMatch" DROP COLUMN "matchDate",
DROP COLUMN "matchdayType",
DROP COLUMN "played",
ALTER COLUMN "matchdayId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SaveGameTeam" ALTER COLUMN "currentSeason" SET DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "MatchState_saveGameMatchId_key" ON "MatchState"("saveGameMatchId");

-- CreateIndex
CREATE INDEX "SaveGameMatch_saveGameId_idx" ON "SaveGameMatch"("saveGameId");

-- CreateIndex
CREATE INDEX "SaveGameMatch_matchdayId_idx" ON "SaveGameMatch"("matchdayId");

-- AddForeignKey
ALTER TABLE "SaveGameMatch" ADD CONSTRAINT "SaveGameMatch_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "Matchday"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchdayId_fkey" FOREIGN KEY ("matchdayId") REFERENCES "Matchday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SaveGamePlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchState" ADD CONSTRAINT "MatchState_saveGameMatchId_fkey" FOREIGN KEY ("saveGameMatchId") REFERENCES "SaveGameMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
