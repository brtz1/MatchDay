// backend/src/services/matchQueryService.ts

import prisma from "../utils/prisma";
import { getGameState } from "./gameState";

export type MatchLiteDTO = {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  refereeName?: string | null;
  matchdayNumber: number;
  matchdayType: "LEAGUE" | "CUP";
};

/**
 * Returns the upcoming match for the given team at the current GameState
 * (current season matchday + type). Returns null if none found.
 * NOTE: No real-world dates are used; selection is by matchday number.
 */
export async function getNextMatchForTeam(teamId: number): Promise<MatchLiteDTO | null> {
  const gs = await getGameState();
  if (!gs || !gs.currentSaveGameId) {
    throw new Error("No active save game in GameState.");
  }

  const { currentSaveGameId, currentMatchday, matchdayType } = gs;

  // 1) Resolve the Matchday row for the current save, number and type.
  const md = await prisma.matchday.findFirst({
    where: {
      saveGameId: currentSaveGameId,
      number: currentMatchday,
      type: matchdayType,
    },
    select: { id: true, number: true, type: true },
  });
  if (!md) return null;

  // 2) Find the unplayed match for this team on that matchday.
  const match = await prisma.saveGameMatch.findFirst({
    where: {
      saveGameId: currentSaveGameId,
      matchdayId: md.id,
      isPlayed: false, // ⬅️ If your schema uses `played`, change to: played: false
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { id: "asc" },
  });
  if (!match) return null;

  // 3) Resolve team names (prefer saveGameTeam; fallback to base Team if ever needed).
  const teamIds = [match.homeTeamId, match.awayTeamId];

  const [saveTeams, baseTeams] = await Promise.all([
    prisma.saveGameTeam.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    }),
    prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    }),
  ]);

  const nameById = new Map<number, string>();
  for (const t of saveTeams) if (t?.id != null && t?.name) nameById.set(t.id, t.name);
  for (const t of baseTeams) if (t?.id != null && t?.name && !nameById.has(t.id)) nameById.set(t.id, t.name);

  const homeTeamId = Number(match.homeTeamId);
  const awayTeamId = Number(match.awayTeamId);

  const homeTeamName = nameById.get(homeTeamId) ?? `Team ${homeTeamId}`;
  const awayTeamName = nameById.get(awayTeamId) ?? `Team ${awayTeamId}`;

  return {
    id: match.id,
    homeTeamId,
    awayTeamId,
    homeTeamName,
    awayTeamName,
    refereeName: (match as any)?.refereeName ?? null,
    matchdayNumber: md.number,
    matchdayType: md.type as "LEAGUE" | "CUP",
  };
}

/**
 * Latest played match between teamA and teamB in this save (either home/away order).
 * Ensures goals are non-null so we can format a clean "X a–b Y" line.
 * Returns a summary string plus IDs/scores and MD info.
 *
 * You can optionally pass saveGameId to query a specific save; otherwise falls back to GameState.
 */
export async function getLastHeadToHeadText(
  teamA: number,
  teamB: number,
  opts?: { saveGameId?: number }
): Promise<{
  text: string | null;
  homeTeamId?: number;
  awayTeamId?: number;
  homeGoals?: number;
  awayGoals?: number;
  matchdayNumber?: number;
  matchdayType?: "LEAGUE" | "CUP";
}> {
  const gs = await getGameState();
  const saveGameId = opts?.saveGameId ?? gs?.currentSaveGameId;
  if (!saveGameId) throw new Error("No active save game in GameState.");

  // 1) Find latest played H2H; avoid relation orderBy to keep types happy.
  const last = await prisma.saveGameMatch.findFirst({
    where: {
      saveGameId,
      isPlayed: true, // If your schema uses `played`, change this to: played: true
      OR: [
        { homeTeamId: teamA, awayTeamId: teamB },
        { homeTeamId: teamB, awayTeamId: teamA },
      ],
      // DO NOT filter by { not: null } on goals if they are non-nullable Int
    },
    orderBy: [{ matchdayId: "desc" }, { id: "desc" }],
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
      matchdayId: true,
    },
  });

  if (!last) return { text: null };

  // 2) Resolve names (prefer SaveGameTeam; fallback to base Team)
  const ids = [last.homeTeamId, last.awayTeamId];
  const [saveTeams, baseTeams] = await Promise.all([
    prisma.saveGameTeam.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    }),
    prisma.team.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    }),
  ]);

  const nameById = new Map<number, string>();
  for (const t of saveTeams) if (t?.id != null && t?.name) nameById.set(t.id, t.name);
  for (const t of baseTeams) if (t?.id != null && t?.name && !nameById.has(t.id)) nameById.set(t.id, t.name);

  const homeName = nameById.get(last.homeTeamId) ?? `Team ${last.homeTeamId}`;
  const awayName = nameById.get(last.awayTeamId) ?? `Team ${last.awayTeamId}`;

  // 3) Fetch matchday info by FK to avoid relying on a relation include name
  const md = await prisma.matchday.findUnique({
    where: { id: last.matchdayId },
    select: { number: true, type: true },
  });

  const mdNum = md?.number;
  const mdType = md?.type as "LEAGUE" | "CUP" | undefined;

  // 4) Build friendly text (guarding just in case someone stored weird scores)
  const hg = typeof last.homeGoals === "number" ? last.homeGoals : null;
  const ag = typeof last.awayGoals === "number" ? last.awayGoals : null;

  const mdLabel =
    mdType === "LEAGUE"
      ? typeof mdNum === "number"
        ? ` (Matchday ${mdNum})`
        : ""
      : typeof mdNum === "number"
      ? ` (${mdType} · MD ${mdNum})`
      : mdType
      ? ` (${mdType})`
      : "";

  const text =
    hg != null && ag != null
      ? `${homeName} ${hg}–${ag} ${awayName}${mdLabel}`
      : `${homeName} vs ${awayName}${mdLabel}`;

  return {
    text,
    homeTeamId: last.homeTeamId,
    awayTeamId: last.awayTeamId,
    homeGoals: hg ?? undefined,
    awayGoals: ag ?? undefined,
    matchdayNumber: mdNum,
    matchdayType: mdType,
  };
}

