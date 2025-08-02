import prisma from "../prisma/client";
import { io } from "../index"; // your socket.io instance
import { MatchEvent } from "@prisma/client";

/**
 * Broadcast a match event to the correct matchday room.
 * Frontend clients should be joined to: "matchday:<id>"
 */
export async function broadcastEvent(event: MatchEvent) {
  const matchdayRoom = `matchday:${event.matchdayId ?? "unknown"}`;
  io.to(matchdayRoom).emit("match-event", {
    matchId: event.matchId,
    minute: event.minute,
    type: event.eventType,
    description: event.description,
    player: event.saveGamePlayerId
  ? await prisma.saveGamePlayer.findUnique({
      where: { id: event.saveGamePlayerId },
      select: { id: true, name: true },
    })
  : null,

  });
}

/**
 * Broadcast a match minute update (tick)
 */
export function broadcastMatchTick(matchId: number, minute: number) {
  io.emit("match-tick", {
    id: matchId,
    minute,
  });
}
