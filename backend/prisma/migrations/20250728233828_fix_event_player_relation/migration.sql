/*
  Warnings:

  - You are about to drop the column `playerId` on the `MatchEvent` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_playerId_fkey";

-- AlterTable
ALTER TABLE "MatchEvent" DROP COLUMN "playerId",
ADD COLUMN     "saveGamePlayerId" INTEGER;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_saveGamePlayerId_fkey" FOREIGN KEY ("saveGamePlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
