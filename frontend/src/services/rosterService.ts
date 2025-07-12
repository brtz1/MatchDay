/**
 * rosterService.ts
 * ----------------
 * Fetches the players belonging to a given team.
 */

import axios from "@/services/axios";
import { SaveGamePlayer } from "@prisma/client";

/* ------------------------------------------------------------------ API */

const BASE = "/teams";

/**
 * GET `/teams/{id}/players`
 *
 * ```ts
 * const squad = await rosterService.getTeamPlayers(42);
 * ```
 */
async function getTeamPlayers(
  teamId: number
): Promise<SaveGamePlayer[]> {
  const { data } = await axios.get<SaveGamePlayer[]>(
    `${BASE}/${teamId}/players`
  );
  return data;
}

/* ------------------------------------------------------------------ Export */

export default {
  getTeamPlayers,
};
