import { Router, type Request, type Response, type NextFunction } from "express";
import { getStandingsGrouped } from "../services/standingsService";
import { getGameState } from "../services/gameState";
import { finalizeStandings } from "../services/matchdayService";

const router = Router();

/** Parse optional saveGameId from query safely */
function parseSaveGameId(req: Request): number | undefined {
  const raw = req.query.saveGameId;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

/**
 * Normalize a single division group to expose BOTH shapes:
 * - Canonical: { division, rows: [{ played, wins, draws, losses, gf, ga, gd, points, position, ... }] }
 * - Legacy:    { division, teams: [{ played, won, draw, lost, goalsFor, goalsAgainst, goalDifference, points, position, ... }] }
 */
function normalizeDivisionGroup(div: any) {
  const division = String(div?.division ?? "");

  // Prefer `rows` (new). If absent, try legacy `teams` and convert.
  const baseRows: any[] = Array.isArray(div?.rows)
    ? div.rows
    : Array.isArray(div?.teams)
    ? (div.teams as any[]).map((t) => ({
        teamId: t.teamId ?? t.id,
        name: t.name,
        played: t.played,
        wins: t.wins ?? t.won ?? 0,
        draws: t.draws ?? t.draw ?? 0,
        losses: t.losses ?? t.lost ?? 0,
        gf: t.gf ?? t.goalsFor ?? 0,
        ga: t.ga ?? t.goalsAgainst ?? 0,
        gd: t.gd ?? t.goalDifference ?? ((t.goalsFor ?? 0) - (t.goalsAgainst ?? 0)),
        points: t.points ?? 0,
        position: t.position ?? 0,
      }))
    : [];

  // Ensure canonical fields exist + consistency
  const rows = baseRows.map((r: any, idx: number) => {
    const played = Number(r.played ?? 0);
    const wins = Number(r.wins ?? 0);
    const draws = Number(r.draws ?? 0);
    const losses = Number(r.losses ?? 0);
    const gf = Number(r.gf ?? 0);
    const ga = Number(r.ga ?? 0);
    const gd = Number(r.gd ?? (gf - ga));
    const points = Number(r.points ?? (wins * 3 + draws));
    const position = Number(r.position ?? idx + 1);

    return {
      teamId: Number(r.teamId ?? r.id),
      name: String(r.name ?? ""),
      played,
      wins,
      draws,
      losses,
      gf,
      ga,
      gd,
      points,
      position,
    };
  });

  // Build legacy alias array (`teams`) for older FE code paths
  const teams = rows.map((t) => ({
    teamId: t.teamId,
    name: t.name,
    division, // older UIs sometimes expect division at row level
    played: t.played,
    won: t.wins,
    draw: t.draws,
    lost: t.losses,
    goalsFor: t.gf,
    goalsAgainst: t.ga,
    goalDifference: t.gd,
    points: t.points,
    position: t.position,
  }));

  return { division, rows, teams };
}

/** Resolve an active saveGameId (query param takes precedence; else GameState) */
async function resolveActiveSaveGameId(req: Request): Promise<number> {
  const fromQuery = parseSaveGameId(req);
  if (typeof fromQuery === "number") return fromQuery;

  const gs = await getGameState();
  const active = gs?.currentSaveGameId;
  if (!active) {
    throw new Error(
      "No active saveGameId found. Pass ?saveGameId=... or ensure GameState.currentSaveGameId is set."
    );
  }
  return active;
}

/** GET /api/standings and /api/standings/current */
async function handleGetStandings(req: Request, res: Response, next: NextFunction) {
  try {
    const saveGameId = await resolveActiveSaveGameId(req);

    // Service returns canonical: [{ division, rows: [...] }]
    const serviceGroups = await getStandingsGrouped(saveGameId);

    // Route guarantees BOTH shapes for maximum compatibility
    const normalized = Array.isArray(serviceGroups)
      ? serviceGroups.map(normalizeDivisionGroup)
      : [];

    res.status(200).json(normalized);
  } catch (error) {
    console.error("❌ Error loading standings:", error);
    next(error);
  }
}

router.get("/", handleGetStandings);
router.get("/current", handleGetStandings);

/**
 * POST /api/standings/finalize
 * Body (optional): { saveGameId?: number }
 *
 * After Standings grace: increments matchday (or rolls season), sets ACTION,
 * and returns updated game state details needed by FE to route back to roster.
 */
router.post(
  "/finalize",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bodyId = typeof req.body?.saveGameId === "number" ? req.body.saveGameId : undefined;
      const saveGameId = bodyId ?? (await resolveActiveSaveGameId(req));

      const gs = await finalizeStandings(saveGameId);

      res.status(200).json({
        ok: true,
        saveGameId,
        coachTeamId: gs.coachTeamId ?? null,
        season: gs.season,
        currentMatchday: gs.currentMatchday,
        matchdayType: gs.matchdayType,
        gameStage: gs.gameStage,
      });
    } catch (error) {
      console.error("❌ Error finalizing standings:", error);
      next(error);
    }
  }
);

export default router;
