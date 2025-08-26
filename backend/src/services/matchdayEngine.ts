// backend/src/services/matchdayEngine.ts

import prisma from "../utils/prisma";
import { GameStage } from "@prisma/client";
// ✅ import simulateMatchday from the correct module
import { simulateMatchday } from "./matchdayService";
// ✅ use the *safe* state initializer that does best-available XI (no hard formation)
import { ensureMatchState } from "./matchStateService";
import { updateLeagueTableForMatchday } from "./leagueTableService";
import { broadcastStageChanged } from "../sockets/broadcast";

const RUNNING = new Map<number, Promise<void>>();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function setStage(saveGameId: number, stage: GameStage) {
  const updated = await prisma.gameState.updateMany({
    where: { currentSaveGameId: saveGameId },
    data: { gameStage: stage },
  });

  if (updated.count === 0) {
    // Fallback for single-row schema
    await prisma.gameState.update({
      where: { id: 1 },
      data: { currentSaveGameId: saveGameId, gameStage: stage },
    });
  }

  try {
    broadcastStageChanged({ gameStage: stage }, saveGameId, { alsoGlobal: true });
  } catch {
    /* socket layer may not be initialized yet; ignore */
  }
}

async function resolveCurrentMatchday(saveGameId: number) {
  const gs = await prisma.gameState.findFirst({
    where: { currentSaveGameId: saveGameId },
    select: { id: true, currentMatchday: true, matchdayType: true },
  });
  if (!gs) throw new Error(`GameState not found for saveGameId ${saveGameId}`);

  const md = await prisma.matchday.findFirst({
    where: {
      saveGameId,
      number: gs.currentMatchday,
      type: gs.matchdayType, // trust the GameState's current type
    },
    select: { id: true },
  });

  if (!md) {
    throw new Error(
      `Matchday ${gs.currentMatchday} (${gs.matchdayType}) not found for saveGameId ${saveGameId}`
    );
  }

  return md.id;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Start (or resume) the live matchday loop for a save.
 * - Ensures initial MatchState for each fixture in the round (best-available XI; no hard 4-4-2)
 * - Runs the per-minute simulation (handles halftime & results flips)
 * - Updates the LeagueTable after the sim completes
 */
export async function startOrResumeMatchday(saveGameId: number): Promise<void> {
  if (RUNNING.has(saveGameId)) return;

  const task = (async () => {
    try {
      // Find the active round for this save
      const matchdayId = await resolveCurrentMatchday(saveGameId);

      // Pre-create/complete match state for all fixtures in this round
      const matches = await prisma.saveGameMatch.findMany({
        where: { saveGameId, matchdayId },
        select: { id: true },
      });

      // 🔒 Use the tolerant initializer (no formation enforcement)
      await Promise.all(
        matches.map(async (m) => {
          try {
            await ensureMatchState(m.id);
          } catch (prepErr) {
            // If something weird happens, don't kill the whole round — log and continue.
            console.warn(`⚠️ ensureMatchState failed for match ${m.id}:`, prepErr);
          }
        })
      );

      // Ensure stage is MATCHDAY (route usually set this already; safe to repeat)
      await setStage(saveGameId, GameStage.MATCHDAY);

      // Run the simulation (handles HALFTIME pause loop internally and flips to RESULTS)
      await simulateMatchday(matchdayId);

      // After sim completes, update League Table for this round
      await updateLeagueTableForMatchday(saveGameId, matchdayId);

      // simulateMatchday already flipped to RESULTS; no extra flip needed here
    } catch (err) {
      console.error(`❌ startOrResumeMatchday failed for save ${saveGameId}:`, err);
      // Do NOT throw users into RESULTS/Standings on prep errors.
      // Keep it safe: fall back to ACTION so the UI can recover.
      try {
        await setStage(saveGameId, GameStage.ACTION);
      } catch {
        /* ignore */
      }
    } finally {
      RUNNING.delete(saveGameId);
    }
  })();

  RUNNING.set(saveGameId, task);
}

/**
 * Pause via stage → HALFTIME.
 * The sim loop polls GameState and will block until stage goes back to MATCHDAY.
 */
export async function pauseMatchday(saveGameId: number) {
  await setStage(saveGameId, GameStage.HALFTIME);
}

/**
 * Stop the loop via stage → RESULTS and drop the handle.
 * With our DB-polled sim, RESULTS indicates termination, so the loop will exit.
 */
export async function stopMatchday(saveGameId: number) {
  await setStage(saveGameId, GameStage.RESULTS);
  RUNNING.delete(saveGameId);
}
