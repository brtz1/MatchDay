-- AlterTable
ALTER TABLE "BaseTeam" ADD COLUMN     "primaryColor" TEXT NOT NULL DEFAULT '#facc15',
ADD COLUMN     "secondaryColor" TEXT NOT NULL DEFAULT '#000000';

-- AddForeignKey
ALTER TABLE "SaveGameTeam" ADD CONSTRAINT "SaveGameTeam_baseTeamId_fkey" FOREIGN KEY ("baseTeamId") REFERENCES "BaseTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
