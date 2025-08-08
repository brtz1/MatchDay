// backend/src/services/matchService.ts

import prisma from '../utils/prisma';
import { Prisma, GameStage } from '@prisma/client';
import { getGameState } from './gameState';
import { generateLineup } from '../utils/formationHelper';
import { simulateMatch } from '../engine/simulateMatch';
import { broadcastMatchTick } from '../sockets/broadcast';
import { sleep } from '../utils/time';
import { applyAISubstitutions } from './halftimeService';

/**
 * Retrieves the persistent match state for a given match ID.
 */
export async function getMatchStateById(matchId: number) {
  return prisma.matchState.findUnique({
    where: { matchId },
  });
}

/**
 * Sets coach's formation, lineup, and bench for the given match/team.
 * Automatically selects the strongest available players by position.
 * (Does NOT touch gameStage—handled in matchdayService.startMatchday)
 */
export async function setCoachFormation(
  matchId: number,
  formation: string,
  isHomeTeam: boolean
): Promise<{ matchId: number; isHomeTeam: boolean }> {
  const saveMatch = await prisma.saveGameMatch.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true },
  });
  if (!saveMatch) {
    throw new Error(`SaveGameMatch ${matchId} not found`);
  }

  const teamId = isHomeTeam ? saveMatch.homeTeamId : saveMatch.awayTeamId;
  const players = await prisma.saveGamePlayer.findMany({
    where: { teamId },
    select: { id: true, position: true, rating: true },
  });

  const typedPlayers = players.map(p => ({
    id: p.id,
    position: p.position as 'GK' | 'DF' | 'MF' | 'AT',
    rating: p.rating,
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
 * Applies a single substitution at halftime or thereafter.
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

/**
 * Simulates every match in a given matchday in real-time,
 * broadcasting events and score ticks via WebSocket.
 */
export async function simulateMatchday(matchdayId: number): Promise<void> {
  // 1) Load all unplayed matches
  const matches = await prisma.saveGameMatch.findMany({
    where: { matchdayId, played: false },
  });

  // 2) Preload per-match player mappings
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
    console.log(
      `[Debug][Match ${m.id}] validSaveIds:`,
      Array.from(validIds).sort((a,b)=>a-b).join(',')
    );
    console.log(
      `[Debug][Match ${m.id}] basePlayerId→saveGamePlayer.id:`,
      Array.from(baseToSave.entries()).map(([b,s])=>`${b}→${s}`).join(',')
    );
  }

  // 3) 90-minute simulation loop
  for (let minute = 1; minute <= 90; minute++) {
    for (const match of matches) {
      const state = await getMatchStateById(match.id);
      if (!state) continue;

      const { validIds, baseToSave } = mappings.get(match.id)!;
      const events = await simulateMatch(match, state, minute);

      for (const ev of events) {
        let pid = ev.saveGamePlayerId;
        if (!validIds.has(pid)) {
          const mapped = baseToSave.get(ev.saveGamePlayerId);
          if (mapped) pid = mapped;
        }
        if (!validIds.has(pid)) {
          console.warn(`⚠️ Unknown player ${ev.saveGamePlayerId} → skipping event.`);
          continue;
        }

        try {
          await prisma.matchEvent.create({
            data: {
              matchdayId: ev.matchdayId,
              minute: ev.minute,
              eventType: ev.eventType,
              description: ev.description,
              saveGamePlayerId: pid,
              saveGameMatchId: match.id,
            },
          });
        } catch (e: any) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2003'
          ) {
            console.warn(`❌ FK error for player ${pid}, skipping.`);
            continue;
          }
          throw e;
        }
      }

      broadcastMatchTick(match.id, minute);
    }

    if (minute === 45) {
      // halftime
      await prisma.gameState.updateMany({ data: { gameStage: GameStage.HALFTIME } });
      const gs = await getGameState();
      const coachTeamId = gs?.coachTeamId!;
      for (const match of matches) {
        if (
          match.homeTeamId !== coachTeamId &&
          match.awayTeamId !== coachTeamId
        ) {
          await applyAISubstitutions(match.id);
        }
      }
      await sleep(10000);
    }

    await sleep(1000);
  }

  // 4) Mark all done & advance to RESULTS
  await Promise.all(
    matches.map(m =>
      prisma.saveGameMatch.update({ where: { id: m.id }, data: { played: true } })
    )
  );
  await prisma.gameState.updateMany({ data: { gameStage: GameStage.RESULTS } });
}
