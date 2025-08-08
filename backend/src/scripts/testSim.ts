// scripts/testSim.ts
import prisma from "../utils/prisma";
import { simulateMatch } from "../engine/simulateMatch";
import { getMatchStateById } from "../services/matchService";

async function main() {
  const match = await prisma.saveGameMatch.findFirst({
    where: { saveGameId: 1, matchdayId: 1 },
  });
  if (!match) throw new Error("No match found!");

  const state = await getMatchStateById(match.id);
  if (!state) throw new Error("No matchState!");

  const events = await simulateMatch(match, state, 1);
  console.log("Engine emitted IDs:", events.map((e) => e.saveGamePlayerId));
}

main().catch(console.error);
