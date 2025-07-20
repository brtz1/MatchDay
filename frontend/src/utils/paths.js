// utils/paths.ts
/**
 * TEAM ROUTES
 */
export function teamUrl(teamId) {
    return `/teams/${teamId}`;
}
/**
 * PLAYER ROUTES
 */
export function playerUrl(playerId) {
    return `/players/${playerId}`;
}
export function playerStatsUrl(playerId) {
    return `/stats/players/${playerId}`;
}
/**
 * MATCH ROUTES
 */
export function matchUrl(matchId) {
    return `/matches/${matchId}`;
}
/**
 * DIVISION STANDINGS
 * (Use division tier like 1, 2, 3, 4)
 */
export function divisionStandingsUrl(tier) {
    return `/standings/division-${tier}`;
}
/**
 * CUP ROUNDS
 * (Use round name: "round-of-64", "quarterfinal", "final", etc.)
 */
export function cupRoundUrl(round) {
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
export const cupUrl = "/cup";
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
//# sourceMappingURL=paths.js.map