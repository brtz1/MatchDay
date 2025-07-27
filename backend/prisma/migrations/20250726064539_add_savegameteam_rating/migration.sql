/*
  Warnings:

  - Added the required column `rating` to the `SaveGameTeam` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SaveGameTeam" ADD COLUMN     "rating" INTEGER NOT NULL;
