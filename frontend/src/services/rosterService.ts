/**
 * rosterService.ts
 * ----------------
 * Fetches the players belonging to a given team.
 */

import axios from "@/services/axios";
import { Backend } from "@/types/backend";

/* ------------------------------------------------------------------ API */

const BASE = "/teams";

/**
 * GET `/teams/{id}/players`
 *
 * ```ts
 * const squad = await rosterService.getTeamPlayers(42);
 * ```
 */
async function getTeamPlayers(teamId: number): Promise<Backend.Player[]> {
  const { data } = await axios.get<Backend.Player[]>(
    `${BASE}/${teamId}/players`
  );
  return data;
}

/* ------------------------------------------------------------------ Export */

export default {
  getTeamPlayers,
};
