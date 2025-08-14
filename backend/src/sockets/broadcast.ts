import { io } from "../index";

// Emit match events to all clients (no room join required).
export function broadcastEventPayload(payload: {
  matchId: number;
  minute: number;
  type: string;
  description: string;
  player: { id: number; name: string } | null;
}) {
  io.emit("match-event", payload);
}

// Unified minute tick with optional live score
export function broadcastMatchTick(
  matchId: number,
  minute: number,
  homeGoals?: number,
  awayGoals?: number
) {
  io.emit("match-tick", {
    id: matchId,
    minute,
    ...(typeof homeGoals === "number" ? { homeGoals } : {}),
    ...(typeof awayGoals === "number" ? { awayGoals } : {}),
  });
}
