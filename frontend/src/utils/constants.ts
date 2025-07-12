/**
 * constants.ts
 * ------------
 * Single location for misc. magic-numbers and strings the client relies on.
 * Update here rather than sprinkling literals throughout the codebase.
 */

import { Position } from "@/types/enums";

/* ───────────────────────────────────────────  UI  */

/** Tailwind break-points (px) – keep in sync with tailwind.config.ts */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

/** Default heights for key layout blocks (vh) */
export const LAYOUT = {
  rosterTableHeight: 60,
  matchTickerHeight: 18,
} as const;

/* ───────────────────────────────────────────  Gameplay  */

/** Positions array in canonical order */
export const POSITIONS: Position[] = ["GK", "DF", "MF", "AT"];

/** Maximum substitutions allowed per match */
export const MAX_SUBS = 3;

/** Transfer window dates (month-day) – client-side only, server validates) */
export const TRANSFER_WINDOWS = {
  summer: { open: "07-01", close: "08-31" },
  winter: { open: "01-01", close: "01-31" },
} as const;

/* ───────────────────────────────────────────  API  */

/** How many rows per page to request for large tables */
export const DEFAULT_PAGE_SIZE = 20;

/** Debounce delays (ms) for search inputs */
export const DEBOUNCE = {
  short: 300,
  long: 600,
} as const;

/* ───────────────────────────────────────────  Misc  */

export const APP_NAME = "MatchDay! 25";
export const GITHUB_REPO = "https://github.com/your-org/matchday";

export default {
  BREAKPOINTS,
  LAYOUT,
  POSITIONS,
  MAX_SUBS,
  TRANSFER_WINDOWS,
  DEFAULT_PAGE_SIZE,
  DEBOUNCE,
  APP_NAME,
  GITHUB_REPO,
};
