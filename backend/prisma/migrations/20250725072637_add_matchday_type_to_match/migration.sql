/*
  Warnings:

  - Added the required column `matchdayType` to the `SaveGameMatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SaveGameMatch" ADD COLUMN     "matchdayType" "MatchdayType" NOT NULL;
