// frontend/src/types/index.ts
/* Barrel file – import once, from everywhere */

/* Project enums (local, stable) */
export * from "./enums";

/* Ambient/legacy namespace from backend.d.ts (kept for compatibility) */
export type { Backend } from "./backend";

/* ------------------------------------------------------------------ */
/* Central DTOs from the API layer (type-only re-exports)              */
/* Keep these in sync with services/axios.ts                           */
/* ------------------------------------------------------------------ */
export type {
  MatchDTO,
  MatchEventDTO,
  MatchStateDTO,
  GameStateDTO,
  StandingsRowDTO,
  TeamMatchInfoDTO,
  PlayerDTO,
  MatchdayType,
  GameStage,
  SaveGameTeamDTO,
  SaveGameListItemDTO,
} from "@/services/axios";

/* ------------------------------------------------------------------ */
/* Socket payloads (type-only)                                        */
/* ------------------------------------------------------------------ */
export type {
  MatchTickPayload,
  MatchEventPayload,
  StageChangedPayload,
} from "@/socket";
