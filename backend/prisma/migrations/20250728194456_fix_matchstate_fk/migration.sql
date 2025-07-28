-- DropForeignKey
ALTER TABLE "MatchState" DROP CONSTRAINT "MatchState_matchId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "MatchStateid" INTEGER;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_MatchStateid_fkey" FOREIGN KEY ("MatchStateid") REFERENCES "MatchState"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchState" ADD CONSTRAINT "MatchState_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "SaveGameMatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
