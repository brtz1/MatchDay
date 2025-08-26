// scripts/testSim.ts
import prisma from "../utils/prisma";
import { simulateMatch } from "../engine/simulateMatch";
import { ensureInitialMatchState } from "../services/matchService";

async function main() {
  const match = await prisma.saveGameMatch.findFirst({
    where: { saveGameId: 1, matchdayId: 1 },
  });
  if (!match) throw new Error("No match found!");

  // Ensure a MatchState exists (new flow) and use it directly
  const state = await ensureInitialMatchState(match.id);

  const events = await simulateMatch(match, state, 1);
  console.log("[testSim] minute=1 events:", events);
  console.log("[testSim] player IDs:", events.map((e) => e.saveGamePlayerId));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
