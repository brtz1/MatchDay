-- AlterTable
ALTER TABLE "Matchday" ADD COLUMN     "season" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "SaveGamePlayerMatchStats" (
    "id" SERIAL NOT NULL,
    "saveGamePlayerId" INTEGER NOT NULL,
    "saveGameMatchId" INTEGER NOT NULL,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellow" INTEGER NOT NULL DEFAULT 0,
    "red" INTEGER NOT NULL DEFAULT 0,
    "injuries" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SaveGamePlayerMatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SaveGamePlayerMatchStats_saveGamePlayerId_idx" ON "SaveGamePlayerMatchStats"("saveGamePlayerId");

-- CreateIndex
CREATE INDEX "SaveGamePlayerMatchStats_saveGameMatchId_idx" ON "SaveGamePlayerMatchStats"("saveGameMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "SaveGamePlayerMatchStats_saveGamePlayerId_saveGameMatchId_key" ON "SaveGamePlayerMatchStats"("saveGamePlayerId", "saveGameMatchId");

-- AddForeignKey
ALTER TABLE "SaveGamePlayerMatchStats" ADD CONSTRAINT "SaveGamePlayerMatchStats_saveGamePlayerId_fkey" FOREIGN KEY ("saveGamePlayerId") REFERENCES "SaveGamePlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGamePlayerMatchStats" ADD CONSTRAINT "SaveGamePlayerMatchStats_saveGameMatchId_fkey" FOREIGN KEY ("saveGameMatchId") REFERENCES "SaveGameMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
