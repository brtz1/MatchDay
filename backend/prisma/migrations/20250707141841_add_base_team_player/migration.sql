-- CreateTable
CREATE TABLE "BaseTeam" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "budget" INTEGER NOT NULL,
    "coachName" TEXT NOT NULL,

    CONSTRAINT "BaseTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasePlayer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "salary" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "BasePlayer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BasePlayer" ADD CONSTRAINT "BasePlayer_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "BaseTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
