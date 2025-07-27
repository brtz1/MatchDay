// utils/paths.ts

/**
 * TEAM ROUTES
 */
export function teamUrl(teamId: number | string): string {
  return `/teams/${teamId}`;
}

/**
 * PLAYER ROUTES
 */
export function playerUrl(playerId: number | string): string {
  return `/players/${playerId}`;
}

export function playerStatsUrl(playerId: number | string): string {
  return `/stats/players/${playerId}`;
}

/**
 * MATCH ROUTES
 */
export function matchUrl(matchId: number | string): string {
  return `/matches/${matchId}`;
}

/**
 * DIVISION STANDINGS
 * (Use division tier like 1, 2, 3, 4)
 */
export function divisionStandingsUrl(tier: number | string): string {
  return `/standings/division-${tier}`;
}

/**
 * CUP ROUNDS
 * (Use round name: "round-of-64", "quarterfinal", "final", etc.)
 */
export function cupRoundUrl(round: string): string {
  return `/cup/${round.toLowerCase()}`;
}

/**
 * TOP PLAYERS
 */
export const topPlayersUrl = "/stats/top-players";

/**
 * MATCHDAY LIVE VIEW
 */
export const matchdayUrl = "/matchday";

/**
 * STANDINGS MAIN PAGE
 */
export const standingsUrl = "/standings";

/**
 * NAVIGATION ROUTES
 */
export const newGameUrl = "/country-selection";
export const drawPageUrl = "/draw";
export const loadGameUrl = "/load-game";
export const settingsUrl = "/settings";
export const titlePageUrl = "/";
export const cupUrl = "/cup-bracket";

/**
 * ADMIN PANELS
 */
export const adminMatchesUrl = "/admin/matches";
export const adminPlayersUrl = "/admin/players";
export const adminTeamsUrl = "/admin/teams";
export const adminStatsUrl = "/admin/player-stats";

/**
 * TRANSFER MARKET
 */
export const transferMarketUrl = "/transfer-market";

/**
 * POST–MATCH SUMMARY
 * (Use matchday ID to build URL)
 */
export function resultsUrl(matchdayId: number | string): string {
  return `/match-summary/${matchdayId}`;
}
