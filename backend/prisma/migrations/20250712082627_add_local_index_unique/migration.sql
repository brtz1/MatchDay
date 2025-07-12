/*
  Warnings:

  - A unique constraint covering the columns `[saveGameId,localIndex]` on the table `SaveGameTeam` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SaveGameTeam_saveGameId_localIndex_key" ON "SaveGameTeam"("saveGameId", "localIndex");
