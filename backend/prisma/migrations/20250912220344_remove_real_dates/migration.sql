/*
  Warnings:

  - You are about to drop the column `date` on the `Finance` table. All the data in the column will be lost.
  - You are about to drop the column `matchDate` on the `Match` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Matchday` table. All the data in the column will be lost.
  - You are about to drop the column `matchDate` on the `SaveGameMatch` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Transfer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Finance" DROP COLUMN "date";

-- AlterTable
ALTER TABLE "Match" DROP COLUMN "matchDate";

-- AlterTable
ALTER TABLE "Matchday" DROP COLUMN "date";

-- AlterTable
ALTER TABLE "SaveGameMatch" DROP COLUMN "matchDate";

-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "date";
