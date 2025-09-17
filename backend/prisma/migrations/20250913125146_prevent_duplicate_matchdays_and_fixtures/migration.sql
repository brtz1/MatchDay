/*
  Warnings:

  - A unique constraint covering the columns `[saveGameId,number]` on the table `Matchday` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[matchdayId,homeTeamId,awayTeamId]` on the table `SaveGameMatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Matchday_saveGameId_number_key" ON "Matchday"("saveGameId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "SaveGameMatch_matchdayId_homeTeamId_awayTeamId_key" ON "SaveGameMatch"("matchdayId", "homeTeamId", "awayTeamId");
