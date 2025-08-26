/*
  Warnings:

  - You are about to drop the column `MatchStateid` on the `Match` table. All the data in the column will be lost.
  - Made the column `saveGameMatchId` on table `MatchEvent` required. This step will fail if there are existing NULL values in that column.
  - Made the column `awayGoals` on table `SaveGameMatch` required. This step will fail if there are existing NULL values in that column.
  - Made the column `homeGoals` on table `SaveGameMatch` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_MatchStateid_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_saveGameMatchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_saveGamePlayerId_fkey";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "MatchStateid";

-- AlterTable
ALTER TABLE "MatchEvent" ALTER COLUMN "saveGameMatchId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SaveGameMatch" ALTER COLUMN "awayGoals" SET NOT NULL,
ALTER COLUMN "awayGoals" SET DEFAULT 0,
ALTER COLUMN "homeGoals" SET NOT NULL,
ALTER COLUMN "homeGoals" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "MatchEvent_matchdayId_idx" ON "MatchEvent"("matchdayId");

-- CreateIndex
CREATE INDEX "MatchEvent_saveGameMatchId_minute_id_idx" ON "MatchEvent"("saveGameMatchId", "minute", "id");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_saveGameMatchId_fkey" FOREIGN KEY ("saveGameMatchId") REFERENCES "SaveGameMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_saveGamePlayerId_fkey" FOREIGN KEY ("saveGamePlayerId") REFERENCES "SaveGamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
