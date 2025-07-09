// src/utils/contract.ts

import { Player } from '@prisma/client';
import { calculateSalary } from './player';

/**
 * Determines if a player will renew contract based on morale, salary, and rating.
 * 
 * Players are more likely to reject renewal if they're underpaid or low morale.
 */
export function shouldRenewContract(player: Player, morale: number): boolean {
  const fairSalary = calculateSalary(player.rating, player.behavior);
  const underpaid = player.salary < fairSalary;

  // Base chance to renew is influenced by morale and rating
  let chance = morale + (underpaid ? -20 : 0) + (player.rating - 50);

  // Clamp between 0–100 to avoid odd cases
  chance = Math.max(0, Math.min(100, chance));

  return Math.random() * 100 < chance;
}
