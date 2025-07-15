/*
  Warnings:

  - You are about to drop the column `awayScore` on the `SaveGameMatch` table. All the data in the column will be lost.
  - You are about to drop the column `homeScore` on the `SaveGameMatch` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SaveGameMatch" DROP COLUMN "awayScore",
DROP COLUMN "homeScore",
ADD COLUMN     "awayGoals" INTEGER,
ADD COLUMN     "homeGoals" INTEGER;
