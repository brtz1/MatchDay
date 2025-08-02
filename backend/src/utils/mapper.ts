// utils/mapper.ts

import { SaveGamePlayer, SaveGameTeam, MatchEvent } from '@prisma/client';
import { PlayerDTO, SaveGamePlayerDTO, TeamDTO, MatchEventDTO } from '../types';
import { calculatePlayerPrice } from './playerValuator';

/**
 * Convert raw position strings (from schema or base player) to enum-friendly values
 */
function normalizePosition(pos: string): 'GK' | 'DF' | 'MF' | 'AT' {
  const map: Record<string, 'GK' | 'DF' | 'MF' | 'AT'> = {
    GK: 'GK',
    DF: 'DF',
    MF: 'MF',
    AT: 'AT',
    goalkeeper: 'GK',
    defender: 'DF',
    midfielder: 'MF',
    attacker: 'AT',
    forward: 'AT',
  };
  return map[pos] ?? 'MF'; // default fallback
}

/**
 * Convert a SaveGamePlayer Prisma model to a PlayerDTO for frontend
 */
export function toPlayerDTO(
  player: SaveGamePlayer & {
    basePlayer: { name: string; nationality: string };
    team?: { name: string };
  }
): PlayerDTO {
  return {
    id: player.id,
    name: player.basePlayer.name,
    nationality: player.basePlayer.nationality,
    position: normalizePosition(player.position),
    rating: player.rating,
    salary: player.salary,
    behavior: player.behavior,
    contractUntil: player.contractUntil,
    teamId: player.teamId ?? null, // ✅ fixed for 'number | null'
    teamName: player.team?.name ?? 'Free Agent',
    price: calculatePlayerPrice(player.rating, player.behavior)
  };
}

/**
 * Convert SaveGamePlayer to a SaveGamePlayerDTO (for internal admin/debug tooling)
 */
export function toSaveGamePlayerDTO(
  player: SaveGamePlayer & {
    basePlayer: { name: string; nationality: string };
    team?: { name: string };
  }
): SaveGamePlayerDTO {
  return {
    id: player.id,
    saveGameId: player.saveGameId,
    basePlayerId: player.basePlayerId,
    name: player.basePlayer.name,
    nationality: player.basePlayer.nationality,
    position: normalizePosition(player.position),
    rating: player.rating,
    salary: player.salary,
    behavior: player.behavior,
    contractUntil: player.contractUntil,
    teamId: player.teamId ?? undefined,            // ✅ Convert null to undefined
    localIndex: player.localIndex ?? undefined,    // ✅ Convert null to undefined
    teamName: player.team?.name ?? 'Free Agent',
  };
}

/**
 * Convert SaveGameTeam to TeamDTO
 */
export function toTeamDTO(team: SaveGameTeam & {
  baseTeam: { country: string; primaryColor: string; secondaryColor: string }
}): TeamDTO {
  return {
    id: team.id,
    name: team.name,
    country: team.baseTeam.country,
    morale: team.morale,
    rating: team.baseTeamId, // Optional: replace with derived rating if needed
    primaryColor: team.baseTeam.primaryColor,
    secondaryColor: team.baseTeam.secondaryColor,
  };
}

/**
 * Convert MatchEvent to MatchEventDTO
 */
export function toMatchEventDTO(
  event: MatchEvent & {
    player?: { name: string };
    team?: { name: string };
  }
): MatchEventDTO {
  return {
    id: event.id,
    matchdayId: event.matchdayId,
    matchId: event.matchId ?? 0, // 👈 fallback
    minute: event.minute,
    eventType: event.eventType,
    description: event.description,
    playerName: event.player?.name,
    teamName: event.team?.name,
  };
}

