/**
 * saveGameService.ts
 * ------------------
 * Wrapper for every “save-game” endpoint:
 *   • list   – GET  /save-game
 *   • create – POST /save-game
 *   • load   – POST /save-game/load
 *   • manual – POST /manual-save
 *
 * Pages can now import these functions instead of sprinkling raw axios calls.
 */

import axios from "@/services/axios";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface SaveGameLite {
  id: number;
  name: string;
  coachName: string;
  createdAt: string;

  /** Optional on list() until backend includes it. Needed by LoadGamePage to show coached team name. */
  coachTeamId?: number;
}

export interface SaveGameWithTeams extends SaveGameLite {
  teams: { id: number; name: string; division: string }[];
}

export interface ManualSaveRequest {
  name: string;        // e.g. "Manual Save"
  coachName: string;   // coach’s display name
}

export interface ManualSaveResponse {
  saveName: string;
  saveGameId: number;
}

export interface NewSaveRequest {
  name: string;              // e.g. "Season 1"
  coachName: string;
  countries: string[];
}

export interface NewSaveResponse {
  userTeamId: number;
  userTeamName: string;
  saveGameId: number;
  divisionPreview: string[];
}

export interface LoadSaveResponse {
  coachTeamId: number;
  saveGameId: number;
}

/* -------------------------------------------------------------------------- */
/* API helpers                                                                */
/* -------------------------------------------------------------------------- */

const BASE = "/save-game";

/**
 * GET `/save-game`
 * @param includeTeams – when true, backend embeds the teams array
 */
async function listSaveGames(
  includeTeams = false
): Promise<SaveGameLite[] | SaveGameWithTeams[]> {
  const { data } = await axios.get(`${BASE}`, {
    params: { includeTeams },
  });
  return data;
}

/**
 * POST `/save-game` – create brand-new save during the draw workflow
 */
async function createNewSave(payload: NewSaveRequest) {
  const { data } = await axios.post<NewSaveResponse>(BASE, payload);
  return data;
}

/**
 * POST `/save-game/load` – resume an existing save
 */
async function loadSave(id: number) {
  const { data } = await axios.post<LoadSaveResponse>(`${BASE}/load`, { id });
  return data;
}

/**
 * POST `/manual-save` – quick in-season save
 */
async function manualSave(payload: ManualSaveRequest) {
  const { data } = await axios.post<ManualSaveResponse>("/manual-save", payload);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */

export default {
  listSaveGames,
  createNewSave,
  loadSave,
  manualSave,
};
