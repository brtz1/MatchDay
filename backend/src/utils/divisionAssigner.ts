// src/utils/divisionAssigner.ts
import { DivisionTier } from '@prisma/client';

export type TeamPoolEntry = { id: number; name: string; country: string; baseRating: number; };
export type DivisionAssignment = {
  division: DivisionTier;
  teamId: number;
  assignedRating: number;
};

const DIVISIONS: DivisionTier[] = [
  DivisionTier.D1,
  DivisionTier.D2,
  DivisionTier.D3,
  DivisionTier.D4,
];

export function assignTeamsToDivisions(
  teams: TeamPoolEntry[]
): DivisionAssignment[] {
  if (teams.length < 128) {
    throw new Error('A minimum of 128 teams is required to start a new game.');
  }

  // Sort descending so highest-rated go to D1, next to D2, etc.
  const sorted = [...teams].sort((a, b) => b.baseRating - a.baseRating);
  const perDivision = 32;
  const assignments: DivisionAssignment[] = [];

  for (let i = 0; i < DIVISIONS.length; i++) {
    const division = DIVISIONS[i];                   // correct enum value
    const sliceStart = i * perDivision;
    const sliceEnd   = sliceStart + perDivision;
    const block      = sorted.slice(sliceStart, sliceEnd);

    for (const team of block) {
      assignments.push({
        division,
        teamId: team.id,
        assignedRating: calculateDivisionBasedRating(division),
      });
    }
  }

  return assignments;
}

function calculateDivisionBasedRating(division: DivisionTier): number {
  switch (division) {
    case DivisionTier.D1: return 95;
    case DivisionTier.D2: return 85;
    case DivisionTier.D3: return 75;
    case DivisionTier.D4: return 65;
    default:             return 50;
  }
}
