/*
  Warnings:

  - Added the required column `rating` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MatchEvent" ADD COLUMN     "playerId" INTEGER;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "rating" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "GameState" (
    "id" SERIAL NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 1,
    "currentMatchday" INTEGER NOT NULL DEFAULT 1,
    "matchdayType" TEXT NOT NULL DEFAULT 'LEAGUE',
    "coachTeamId" INTEGER NOT NULL,
    "gameStage" TEXT NOT NULL DEFAULT 'ACTION',

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchState" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "homeLineup" INTEGER[],
    "awayLineup" INTEGER[],
    "homeReserves" INTEGER[],
    "awayReserves" INTEGER[],
    "homeSubsMade" INTEGER NOT NULL DEFAULT 0,
    "awaySubsMade" INTEGER NOT NULL DEFAULT 0,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MatchState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchState_matchId_key" ON "MatchState"("matchId");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_coachTeamId_fkey" FOREIGN KEY ("coachTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchState" ADD CONSTRAINT "MatchState_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
