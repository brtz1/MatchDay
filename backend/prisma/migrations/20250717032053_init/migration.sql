-- AlterTable
ALTER TABLE "BaseTeam" ADD COLUMN     "stadiumCapacity" INTEGER;

-- AddForeignKey
ALTER TABLE "SaveGamePlayer" ADD CONSTRAINT "SaveGamePlayer_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "BasePlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
