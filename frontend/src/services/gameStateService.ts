/**
 * gameStateService.ts
 * -------------------
 * Consolidates all “game-level” REST calls — current match-day, manual saves,
 * load existing saves, etc.  Pages can import these helpers instead of
 * sprinkling raw axios calls everywhere.
 */

import axios from "@/services/axios";

/* ------------------------------------------------------------------ Types */

export interface GameState {
  currentMatchday: number;
  coachTeamId?: number;
  currentSaveGameId?: number;
  timestamp: string;

  // ✅ Include PENALTIES to match store usage
  gameStage: "ACTION" | "MATCHDAY" | "HALFTIME" | "RESULTS" | "STANDINGS" | "PENALTIES";
  matchdayType: "LEAGUE" | "CUP";
}

export interface ManualSavePayload {
  name: string;
  coachName: string;
}

export interface ManualSaveResponse {
  saveName: string;
  saveGameId: number;
}

export interface LoadSaveRequest {
  id: number;
}

export interface LoadSaveResponse {
  coachTeamId: number;
  saveGameId: number;
}

export interface NewSaveRequest {
  name: string;
  coachName: string;
  countries: string[];
}

export interface NewSaveResponse {
  userTeamId: number;
  userTeamName: string;
  saveGameId: number;
  divisionPreview: string[];
}

/* ------------------------------------------------------------------ API */

export async function getGameState(): Promise<GameState> {
  const { data } = await axios.get<GameState>("/gamestate");
  return data;
}

export async function manualSave(payload: ManualSavePayload) {
  const { data } = await axios.post<ManualSaveResponse>("/manual-save", payload);
  return data;
}

export async function loadSave(request: LoadSaveRequest) {
  const { data } = await axios.post<LoadSaveResponse>("/save-game/load", request);
  return data;
}

export async function createNewSave(request: NewSaveRequest) {
  const { data } = await axios.post<NewSaveResponse>("/save-game", request);
  return data;
}

/* ------------------------------------------------------------------ Export */

export default {
  getGameState,
  manualSave,
  loadSave,
  createNewSave,
};
