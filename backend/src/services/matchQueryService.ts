import prisma from '../utils/prisma';
import { getGameState } from './gameState';

export type MatchLiteDTO = {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: string;
  refereeName?: string | null;
  matchdayNumber: number;
  matchdayType: 'LEAGUE' | 'CUP';
};

/**
 * Returns the upcoming match for the given team at the current GameState
 * (current season matchday + type). Returns null if none found.
 */
export async function getNextMatchForTeam(teamId: number): Promise<MatchLiteDTO | null> {
  const gs = await getGameState();
  if (!gs || !gs.currentSaveGameId) {
    throw new Error('No active save game in GameState.');
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
      isPlayed: false,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { matchDate: 'asc' },
  });
  if (!match) return null;

  // 3) Get names by trying both SaveGameTeam and base Team tables,
  //    so we work no matter which ID-space the match records use.
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
    matchDate:
      match.matchDate instanceof Date ? match.matchDate.toISOString() : String(match.matchDate),
    // If you add a scalar or relation for referee, fill here
    refereeName: (match as any)?.refereeName ?? null,
    matchdayNumber: md.number,
    matchdayType: md.type as 'LEAGUE' | 'CUP',
  };
}

/** Latest played match between teamA and teamB in this save (either home/away order). */
export async function getLastHeadToHeadText(
  teamA: number,
  teamB: number
): Promise<{
  text: string | null;
  homeTeamId?: number;
  awayTeamId?: number;
  homeGoals?: number;
  awayGoals?: number;
  matchDate?: string;
}> {
  const gs = await getGameState();
  const saveGameId = gs?.currentSaveGameId;
  if (!saveGameId) throw new Error('No active save game in GameState.');

  const last = await prisma.saveGameMatch.findFirst({
    where: {
      saveGameId,
      isPlayed: true,
      OR: [
        { homeTeamId: teamA, awayTeamId: teamB },
        { homeTeamId: teamB, awayTeamId: teamA },
      ],
    },
    orderBy: { matchDate: 'desc' },
  });

  if (!last) return { text: null };

  const ids = [last.homeTeamId, last.awayTeamId];
  const [saveTeams, baseTeams] = await Promise.all([
    prisma.saveGameTeam.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    prisma.team.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const nameById = new Map<number, string>();
  for (const t of saveTeams) if (t?.id != null && t?.name) nameById.set(t.id, t.name);
  for (const t of baseTeams) if (t?.id != null && t?.name && !nameById.has(t.id)) nameById.set(t.id, t.name);

  const homeName = nameById.get(last.homeTeamId) ?? `Team ${last.homeTeamId}`;
  const awayName = nameById.get(last.awayTeamId) ?? `Team ${last.awayTeamId}`;

  const text = `${homeName} ${last.homeGoals}–${last.awayGoals} ${awayName}`;

  return {
    text,
    homeTeamId: last.homeTeamId,
    awayTeamId: last.awayTeamId,
    homeGoals: last.homeGoals,
    awayGoals: last.awayGoals,
    matchDate: last.matchDate instanceof Date ? last.matchDate.toISOString() : String(last.matchDate),
  };
}
