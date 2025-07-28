-- DropForeignKey
ALTER TABLE "LeagueTable" DROP CONSTRAINT "LeagueTable_teamId_fkey";

-- AddForeignKey
ALTER TABLE "LeagueTable" ADD CONSTRAINT "LeagueTable_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SaveGameTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
