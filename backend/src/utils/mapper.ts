// utils/mapper.ts

import { SaveGamePlayer, SaveGameTeam, MatchEvent } from '@prisma/client';
import { PlayerDTO, SaveGamePlayerDTO, TeamDTO, MatchEventDTO } from '../types';
import { calculatePlayerPrice } from './playerValuator';

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
    position: player.position,
    rating: player.rating,
    salary: player.salary,
    behavior: player.behavior,
    contractUntil: player.contractUntil,
    teamName: player.team?.name ?? 'Free Agent',
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
    position: player.position,
    rating: player.rating,
    salary: player.salary,
    behavior: player.behavior,
    contractUntil: player.contractUntil,
    teamId: player.teamId,
    localIndex: player.localIndex,
    teamName: player.team?.name ?? 'Free Agent',
  };
}

/**
 * Convert SaveGameTeam to TeamDTO
 */
export function toTeamDTO(team: SaveGameTeam & { baseTeam: { country: string; primaryColor: string; secondaryColor: string } }): TeamDTO {
  return {
    id: team.id,
    name: team.name,
    country: team.baseTeam.country,
    morale: team.morale,
    rating: team.baseTeamId, // or computed team.rating if available
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
    matchId: event.matchId,
    minute: event.minute,
    eventType: event.eventType,
    description: event.description,
    playerName: event.player?.name,
    teamName: event.team?.name,
  };
}
