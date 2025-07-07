-- CreateTable
CREATE TABLE "SaveGame" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "coachName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaveGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaveGameTeam" (
    "id" SERIAL NOT NULL,
    "saveGameId" INTEGER NOT NULL,
    "baseTeamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "division" TEXT NOT NULL,
    "coachName" TEXT NOT NULL,
    "morale" INTEGER NOT NULL,
    "currentSeason" INTEGER NOT NULL,

    CONSTRAINT "SaveGameTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaveGamePlayer" (
    "id" SERIAL NOT NULL,
    "saveGameId" INTEGER NOT NULL,
    "basePlayerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "salary" INTEGER NOT NULL,
    "teamId" INTEGER,
    "contractUntil" INTEGER NOT NULL,

    CONSTRAINT "SaveGamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaveGameMatch" (
    "id" SERIAL NOT NULL,
    "saveGameId" INTEGER NOT NULL,
    "homeTeamId" INTEGER NOT NULL,
    "awayTeamId" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "played" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SaveGameMatch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SaveGameTeam" ADD CONSTRAINT "SaveGameTeam_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "SaveGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGamePlayer" ADD CONSTRAINT "SaveGamePlayer_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "SaveGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaveGameMatch" ADD CONSTRAINT "SaveGameMatch_saveGameId_fkey" FOREIGN KEY ("saveGameId") REFERENCES "SaveGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
