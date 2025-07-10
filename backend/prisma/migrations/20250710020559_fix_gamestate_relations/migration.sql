/*
  Warnings:

  - Changed the type of `division` on the `SaveGameTeam` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "DivisionTier" AS ENUM ('D1', 'D2', 'D3', 'D4');

-- DropForeignKey
ALTER TABLE "GameState" DROP CONSTRAINT "GameState_coachTeamId_fkey";

-- AlterTable
ALTER TABLE "SaveGameTeam" DROP COLUMN "division",
ADD COLUMN     "division" "DivisionTier" NOT NULL;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_coachTeamId_fkey" FOREIGN KEY ("coachTeamId") REFERENCES "SaveGameTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
