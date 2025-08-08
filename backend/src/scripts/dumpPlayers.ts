// scripts/dumpPlayers.ts
import prisma from "../utils/prisma";

async function main() {
  const players = await prisma.saveGamePlayer.findMany({
    where: { saveGameId: 1 },
    select: { id: true, basePlayerId: true },
    orderBy: { id: "asc" },
  });
  console.table(players);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
