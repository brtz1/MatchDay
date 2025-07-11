// src/utils/contract.ts

import { Player } from '@prisma/client';

/**
 * Calculates a “fair” salary for a player based on rating and behavior.
 * Mirrors the logic used elsewhere (e.g. moraleContractService).
 *
 * @param rating – the player’s overall rating
 * @param behavior – the player’s behavior score
 * @returns a salary figure
 */
export function calculateSalary(rating: number, behavior: number): number {
  const base = rating * 50;
  // Good behavior slightly reduces salary costs; poor behavior increases them
  const multiplier = behavior >= 4 ? 0.9 : behavior === 1 ? 1.1 : 1.0;
  return Math.round(base * multiplier);
}

/**
 * Determines whether a player will renew their contract.
 *
 * The chance is based on:
 *  - teamMorale (higher morale → more likely to stay)
 *  - whether the player is underpaid relative to fair salary
 *  - the player’s rating
 *
 * @param player – the Player record (including current salary, rating, behavior)
 * @param teamMorale – current morale of the player’s coach/team (0–100)
 * @returns true if the player opts to renew, false if not
 */
export function shouldRenewContract(player: Player, teamMorale: number): boolean {
  const fairSalary = calculateSalary(player.rating, player.behavior);
  const underpaid = player.salary < fairSalary;

  // Base chance calculation
  let chance = teamMorale + (underpaid ? -20 : 0) + (player.rating - 50);

  // Clamp to [0, 100]
  chance = Math.max(0, Math.min(100, chance));

  return Math.random() * 100 < chance;
}
