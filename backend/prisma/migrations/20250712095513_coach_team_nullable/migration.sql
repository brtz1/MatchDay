-- DropForeignKey
ALTER TABLE "GameState" DROP CONSTRAINT "GameState_coachTeamId_fkey";

-- AlterTable
ALTER TABLE "GameState" ALTER COLUMN "coachTeamId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_coachTeamId_fkey" FOREIGN KEY ("coachTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
