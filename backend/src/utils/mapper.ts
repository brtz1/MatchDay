// backend/src/utils/mapper.ts

import { SaveGamePlayer, SaveGameTeam, MatchEvent } from '@prisma/client';
import { PlayerDTO, SaveGamePlayerDTO, TeamDTO, MatchEventDTO } from '../types';
import { calculatePlayerPrice } from './playerValuator';

/**
 * Convert raw position strings (from schema or base player) to enum-friendly values
 */
function normalizePosition(pos: string): 'GK' | 'DF' | 'MF' | 'AT' {
  const key = (pos || '').toUpperCase();
  const map: Record<string, 'GK' | 'DF' | 'MF' | 'AT'> = {
    GK: 'GK',
    G: 'GK',
    GOALKEEPER: 'GK',
    DF: 'DF',
    D: 'DF',
    DEF: 'DF',
    DEFENDER: 'DF',
    MF: 'MF',
    M: 'MF',
    MID: 'MF',
    MIDFIELDER: 'MF',
    AT: 'AT',
    F: 'AT',
    FW: 'AT',
    ATT: 'AT',
    ATTACKER: 'AT',
    ST: 'AT',
    FORWARD: 'AT',
  };
  return map[key] ?? 'MF'; // default fallback
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
    teamId: player.teamId ?? null, // number | null
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
    teamId: player.teamId ?? undefined,            // Convert null to undefined
    localIndex: player.localIndex ?? undefined,    // Convert null to undefined
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
    // Using baseTeamId as a placeholder rating; change if you have a proper rating source.
    rating: team.baseTeamId,
    primaryColor: team.baseTeam.primaryColor,
    secondaryColor: team.baseTeam.secondaryColor,
  };
}

/**
 * Convert MatchEvent to MatchEventDTO
 * Schema note: Prisma model uses `type` (enum) not `eventType`.
 */
export function toMatchEventDTO(
  event: MatchEvent & {
    player?: { name: string };
    team?: { name: string };
  }
): MatchEventDTO {
  return {
    id: event.id,
    matchdayId: event.matchdayId ?? 0,            // coerce null -> 0 to satisfy DTO
    matchId: event.matchId ?? 0,                  // coerce null -> 0 (fallback)
    minute: event.minute,
    eventType: String((event as any).type ?? ''), // map from Prisma `type`
    description: event.description,
    playerName: (event as any).player?.name,
    teamName: (event as any).team?.name,
  };
}
