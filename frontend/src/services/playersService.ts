/**
 * playersService.ts
 * -----------------
 * REST wrapper for all player-related endpoints.
 */

import axios from "@/services/axios";

/* ------------------------------------------------------------------ Types */

export interface Player {
  id: number;
  name: string;
  age: number;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
  value: number;
  salary: number;
  team?: { id: number; name: string };
}

export interface CreatePlayerRequest
  extends Omit<Player, "id" | "team"> {
  teamId?: number;
}

export interface CreatePlayerResponse {
  id: number;
}

/* ------------------------------------------------------------------ API */

const BASE = "/players";

/** GET `/players` – list all players or free agents */
async function getPlayers(): Promise<Player[]> {
  const { data } = await axios.get<Player[]>(BASE);
  return data;
}

/** POST `/players` – create a new player */
async function createPlayer(payload: CreatePlayerRequest) {
  const { data } = await axios.post<CreatePlayerResponse>(
    BASE,
    payload
  );
  return data;
}

/* ------------------------------------------------------------------ Export */

export default {
  getPlayers,
  createPlayer,
};
