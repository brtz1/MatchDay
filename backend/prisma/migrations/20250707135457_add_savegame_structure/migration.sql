-- DropForeignKey
ALTER TABLE "Coach" DROP CONSTRAINT "Coach_teamId_fkey";

-- AlterTable
ALTER TABLE "Coach" ALTER COLUMN "teamId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
