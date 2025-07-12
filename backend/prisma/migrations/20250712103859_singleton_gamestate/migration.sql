/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `GameState` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "GameState" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "GameState_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "GameState_id_key" ON "GameState"("id");
