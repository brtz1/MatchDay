import prisma from '../utils/prisma';
import { Prisma, GameStage } from '@prisma/client';
import { generateLineup } from '../utils/formationHelper';
import { simulateMatch } from '../engine/simulateMatch';
import { broadcastMatchTick, broadcastEventPayload } from '../sockets/broadcast';
import { sleep } from '../utils/time';
import { applyAISubstitutions } from './halftimeService';
import { getGameState } from './gameState';

/* --------------------------- position normalization -------------------------- */
function normalizePos(p: string): 'GK' | 'DF' | 'MF' | 'AT' {
  const s = (p || '').toUpperCase();
  if (s === 'GK' || s === 'G' || s === 'GOALKEEPER') return 'GK';
  if (s === 'DF' || s === 'D' || s === 'DEF' || s === 'DEFENDER') return 'DF';
  if (s === 'MF' || s === 'M' || s === 'MID' || s === 'MIDFIELDER') return 'MF';
  if (s === 'AT' || s === 'F' || s === 'FW' || s === 'ATT' || s === 'ATTACKER' || s === 'ST') return 'AT';
  return 'MF';
}

/* ------------------------------- Match State -------------------------------- */
export async function getMatchStateById(matchId: number) {
  return prisma.matchState.findUnique({ where: { matchId } });
}

/**
 * Ensure a MatchState exists and has both sides populated (lineup + bench + formations).
 * Does not overwrite an existing, fully-initialized side.
 */
export async function ensureInitialMatchState(
  matchId: number,
  homeFormation: string = '4-4-2',
  awayFormation: string = '4-4-2'
) {
  const match = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { id: true, saveGameId: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) throw new Error(`SaveGameMatch ${matchId} not found`);

  const existing = await prisma.matchState.findUnique({ where: { matchId } });

  const buildSide = async (teamId: number, formation: string) => {
    let players = await prisma.saveGamePlayer.findMany({
      where: { teamId },
      select: { id: true, position: true, rating: true },
    });

    // Fallback: if a team has no assigned players yet, use a neutral pool from this save
    if (players.length === 0) {
      players = await prisma.saveGamePlayer.findMany({
        where: { saveGameId: match.saveGameId },
        take: 22,
        select: { id: true, position: true, rating: true },
      });
    }

    const typed = players.map((p) => ({
      id: p.id,
      position: normalizePos(p.position),
      rating: p.rating ?? 0,
    }));

    const { lineup, bench } = generateLineup(typed, formation);
    return { formation, lineup, bench };
  };

  const upserts: any = {};
  if (!existing?.homeLineup?.length || !existing?.homeReserves?.length || !existing?.homeFormation) {
    const h = await buildSide(match.homeTeamId, homeFormation);
    upserts.homeFormation = h.formation;
    upserts.homeLineup = h.lineup;
    upserts.homeReserves = h.bench;
    upserts.homeSubsMade = 0;
  }
  if (!existing?.awayLineup?.length || !existing?.awayReserves?.length || !existing?.awayFormation) {
    const a = await buildSide(match.awayTeamId, awayFormation);
    upserts.awayFormation = a.formation;
    upserts.awayLineup = a.lineup;
    upserts.awayReserves = a.bench;
    upserts.awaySubsMade = 0;
  }

  if (!existing) {
    return prisma.matchState.create({ data: { matchId, ...upserts } });
  }

  if (Object.keys(upserts).length > 0) {
    return prisma.matchState.update({ where: { matchId }, data: upserts });
  }

  return existing;
}

/**
 * Sets coach's formation, lineup, and bench for the given match/team.
 */
export async function setCoachFormation(
  matchId: number,
  formation: string,
  isHomeTeam: boolean
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  const saveMatch = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true, saveGameId: true },
  });
  if (!saveMatch) throw new Error(`SaveGameMatch ${matchId} not found`);

  const teamId = isHomeTeam ? saveMatch.homeTeamId : saveMatch.awayTeamId;
  let players = await prisma.saveGamePlayer.findMany({
    where: { teamId },
    select: { id: true, position: true, rating: true },
  });

  if (players.length === 0) {
    players = await prisma.saveGamePlayer.findMany({
      where: { saveGameId: saveMatch.saveGameId },
      take: 22,
      select: { id: true, position: true, rating: true },
    });
  }

  const typedPlayers = players.map((p) => ({
    id: p.id,
    position: normalizePos(p.position),
    rating: p.rating ?? 0,
  }));
  const { lineup, bench } = generateLineup(typedPlayers, formation);

  const upsertData = isHomeTeam
    ? { homeFormation: formation, homeLineup: lineup, homeReserves: bench, homeSubsMade: 0 }
    : { awayFormation: formation, awayLineup: lineup, awayReserves: bench, awaySubsMade: 0 };

  await prisma.matchState.upsert({
    where: { matchId },
    create: { matchId, ...upsertData },
    update: upsertData,
  });

  return { matchId, isHomeTeam };
}

/**
 * Applies a substitution (max 3).
 */
export async function applySubstitution(
  matchId: number,
  outId: number,
  inId: number,
  isHomeTeam: boolean
): Promise<void> {
  const state = await getMatchStateById(matchId);
  if (!state) throw new Error(`MatchState for match ${matchId} not found`);

  const lineupKey = isHomeTeam ? 'homeLineup' : 'awayLineup';
  const reserveKey = isHomeTeam ? 'homeReserves' : 'awayReserves';
  const subsKey = isHomeTeam ? 'homeSubsMade' : 'awaySubsMade';

  const lineup = [...(state as any)[lineupKey]] as number[];
  const reserves = [...(state as any)[reserveKey]] as number[];
  let subsMade = (state as any)[subsKey] as number;

  if (subsMade >= 3) throw new Error('No substitutions remaining');
  if (!lineup.includes(outId)) throw new Error('Player to sub out not in lineup');
  if (!reserves.includes(inId)) throw new Error('Player to sub in not on bench');

  lineup[lineup.indexOf(outId)] = inId;
  reserves[reserves.indexOf(inId)] = outId;
  subsMade++;

  await prisma.matchState.update({
    where: { matchId },
    data: {
      [lineupKey]: lineup,
      [reserveKey]: reserves,
      [subsKey]: subsMade,
    } as any,
  });
}

/* ----------------------------- Matchday Sim Loop ---------------------------- */
/**
 * Simulates every match in a given matchday in real-time,
 * broadcasting events and score ticks via WebSocket.
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId, played: false },
  });
  if (matches.length === 0) return;

  await Promise.all(matches.map(m => ensureInitialMatchState(m.id)));

  type Mapping = { validIds: Set<number>; baseToSave: Map<number, number> };
  const mappings = new Map<number, Mapping>();
  for (const m of matches) {
    const sgPlayers = await prisma.saveGamePlayer.findMany({
      where: { saveGameId: m.saveGameId },
      select: { id: true, basePlayerId: true },
    });
    const validIds = new Set(sgPlayers.map(p => p.id));
    const baseToSave = new Map(sgPlayers.map(p => [p.basePlayerId, p.id]));
    mappings.set(m.id, { validIds, baseToSave });
  }

  for (let minute = 1; minute <= 90; minute++) {
    if (minute === 45) {
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.HALFTIME } });

      const gs = await getGameState();
      const coachTeamId = gs?.coachTeamId!;
      for (const match of matches) {
        if (match.homeTeamId !== coachTeamId && match.awayTeamId !== coachTeamId) {
          await applyAISubstitutions(match.id);
        }
      }
      // wait for resume
      while (true) {
        const resumed = await prisma.gameState.count({ where: { gameStage: GameStage.MATCHDAY } });
        if (resumed > 0) break;
        await sleep(300);
      }
    }

    for (const match of matches) {
      const state = await getMatchStateById(match.id);
      if (!state) continue;

      const { validIds, baseToSave } = mappings.get(match.id)!;
      const events = await simulateMatch(match, state, minute);

      for (const ev of events) {
        // optimistic broadcast
        let payloadPlayer: { id: number; name: string } | null = null;

        let pid = ev.saveGamePlayerId as number | null | undefined;
        if (pid && !validIds.has(pid)) {
          const mapped = baseToSave.get(pid);
          if (mapped) pid = mapped;
        }
        if (pid) {
          const p = await prisma.saveGamePlayer.findUnique({
            where: { id: pid },
            select: { id: true, name: true },
          });
          if (p) payloadPlayer = p;
          else pid = null;
        }

        await broadcastEventPayload({
          matchId: match.id,
          minute: ev.minute,
          type: ev.eventType,
          description: ev.description,
          player: payloadPlayer,
        });

        // persist event (with FK fallback)
        try {
          await prisma.matchEvent.create({
            data: {
              matchdayId: (ev as any).matchdayId ?? null,
              minute: ev.minute,
              eventType: ev.eventType,
              description: ev.description,
              saveGamePlayerId: pid ?? null,
              saveGameMatchId: match.id,
            },
          });
        } catch (e: any) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
            try {
              await prisma.matchEvent.create({
                data: {
                  matchdayId: (ev as any).matchdayId ?? null,
                  minute: ev.minute,
                  eventType: ev.eventType,
                  description: ev.description,
                  saveGamePlayerId: null,
                  saveGameMatchId: match.id,
                },
              });
            } catch (e2) {
              console.warn(`❌ Event insert failed after FK null fallback:`, e2);
            }
          } else {
            throw e;
          }
        }
      }

      // after processing this minute for this match, fetch live score and broadcast tick
      const fresh = await prisma.saveGameMatch.findUnique({
        where: { id: match.id },
        select: { homeGoals: true, awayGoals: true },
      });
      broadcastMatchTick(match.id, minute, fresh?.homeGoals ?? 0, fresh?.awayGoals ?? 0);
    }

    await sleep(1000);
  }

  await Promise.all(
    matches.map(m =>
      prisma.saveGameMatch.update({ where: { id: m.id }, data: { played: true } })
    )
  );
  await prisma.gameState.updateMany({ data: { gameStage: GameStage.RESULTS } });
}
