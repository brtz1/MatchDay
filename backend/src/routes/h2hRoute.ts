// backend/src/routes/h2hRoute.ts
import { Router, type Request, type Response } from "express";
import { getLastHeadToHeadText } from "../services/matchQueryService";

const router = Router();

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function toId(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Shape the payload so FE can always read something */
function sendH2H(res: Response, raw: unknown, teamA: number, teamB: number) {
  if (typeof raw === "string") {
    return res.json({ text: raw });
  }
  if (raw && typeof raw === "object") {
    const r: any = raw;
    if (typeof r.text === "string" || typeof r.summary === "string" || typeof r.result === "string") {
      return res.json(r);
    }
  }
  return res.json({
    text: `No recent head-to-head found for teams ${teamA} and ${teamB}.`,
  });
}

/* ------------------------------------------------------------------ */
/* Legacy route (kept for compatibility)                              */
/* GET /api/matches/h2h-last/:teamA/:teamB[?saveGameId=]              */
/* ------------------------------------------------------------------ */
router.get("/h2h-last/:teamA/:teamB", async (req: Request, res: Response) => {
  try {
    const teamA = toId(req.params.teamA);
    const teamB = toId(req.params.teamB);
    if (!teamA || !teamB) {
      return res.status(400).json({ error: "Invalid team IDs" });
    }
    const saveGameId = toId(req.query.saveGameId);
    const data = await getLastHeadToHeadText(teamA, teamB, { saveGameId: saveGameId ?? undefined });
    return sendH2H(res, data, teamA, teamB);
  } catch (err: any) {
    console.error("[GET /matches/h2h-last/:teamA/:teamB] Error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

/* ------------------------------------------------------------------ */
/* Canonical route expected by the FE                                 */
/* GET /api/matches/last-head-to-head?homeId=&awayId[&saveGameId]     */
/* ------------------------------------------------------------------ */
router.get("/last-head-to-head", async (req: Request, res: Response) => {
  try {
    const homeId = toId(req.query.homeId);
    const awayId = toId(req.query.awayId);
    if (!homeId || !awayId) {
      return res.status(400).json({ error: "homeId and awayId are required numeric IDs" });
    }
    const saveGameId = toId(req.query.saveGameId);
    const data = await getLastHeadToHeadText(homeId, awayId, { saveGameId: saveGameId ?? undefined });
    return sendH2H(res, data, homeId, awayId);
  } catch (err: any) {
    console.error("[GET /matches/last-head-to-head] Error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
