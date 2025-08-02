import { SaveGameMatch, MatchState } from "@prisma/client";
import prisma from "../utils/prisma";

// Types for returned events
interface SimulatedMatchEvent {
  matchdayId: number;
  minute: number;
  eventType: "GOAL" | "YELLOW" | "RED" | "INJURY";
  description: string;
  saveGamePlayerId: number;
}

/**
 * Simulates a single minute of a match and returns any events that occurred.
 */
export async function simulateMatch(
  match: SaveGameMatch,
  state: MatchState,
  minute: number
): Promise<SimulatedMatchEvent[]> {
  const events: SimulatedMatchEvent[] = [];

  // Fetch home/away players (lineup only)
  const homePlayerIds = state.homeLineup;
  const awayPlayerIds = state.awayLineup;
  const allPlayerIds = [...homePlayerIds, ...awayPlayerIds];

  const players = await prisma.saveGamePlayer.findMany({
    where: { id: { in: allPlayerIds } },
    select: { id: true, name: true, behavior: true, teamId: true },
  });

  const playerMap = new Map(players.map(p => [p.id, p]));

  // Roll a dice: 1 in 12 chance something happens this minute
  const eventChance = Math.random();
  if (eventChance > 0.08) return []; // ~92% of minutes = no event

  // Pick random player on the field
  const allLineup = allPlayerIds.filter(id => playerMap.has(id));
  const randomPlayerId = allLineup[Math.floor(Math.random() * allLineup.length)];
  const player = playerMap.get(randomPlayerId);
  if (!player) return [];

  const behavior = player.behavior ?? 3; // default neutral

  // Decide event type using weight based on behavior
  const roll = Math.random();
  let eventType: SimulatedMatchEvent["eventType"] = "GOAL";

  if (roll < 0.02 * behavior) eventType = "RED";
  else if (roll < 0.05 * behavior) eventType = "YELLOW";
  else if (roll < 0.04) eventType = "INJURY";
  else eventType = "GOAL";

  let description = "";

  switch (eventType) {
    case "GOAL":
      description = `${player.name} scores!`;
      break;
    case "YELLOW":
      description = `${player.name} gets a yellow card.`;
      break;
    case "RED":
      description = `${player.name} is sent off!`;
      break;
    case "INJURY":
      description = `${player.name} is injured and limps off.`;
      break;
  }

  const event: SimulatedMatchEvent = {
    matchdayId: match.matchdayId!, // ✅ required by schema
    minute,
    eventType,                    // ✅ match Prisma field name
    description,
    saveGamePlayerId: player.id,
  };

  return [event];
}
