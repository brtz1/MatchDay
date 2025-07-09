// src/utils/divisionAssigner.ts

export type TeamPoolEntry = {
  id: number;
  name: string;
  country: string;
  baseRating: number;
};

export type DivisionAssignment = {
  division: number; // 1 to 4
  teamId: number;
  assignedRating: number;
};

export function assignTeamsToDivisions(
  teams: TeamPoolEntry[]
): DivisionAssignment[] {
  if (teams.length < 128) {
    throw new Error('A minimum of 128 teams is required to start a new game.');
  }

  // Sort teams by base rating, ascending (lower rated teams to D1)
  const sorted = [...teams].sort((a, b) => a.baseRating - b.baseRating);

  const teamsPerDivision = 32;
  const assignments: DivisionAssignment[] = [];

  for (let i = 0; i < 4; i++) {
    const divisionTeams = sorted.slice(i * teamsPerDivision, (i + 1) * teamsPerDivision);

    for (const team of divisionTeams) {
      const newRating = calculateDivisionBasedRating(i + 1);
      assignments.push({
        teamId: team.id,
        division: i + 1,
        assignedRating: newRating,
      });
    }
  }

  return assignments;
}

function calculateDivisionBasedRating(division: number): number {
  switch (division) {
    case 1: return 95;
    case 2: return 85;
    case 3: return 75;
    case 4: return 65;
    default: return 50;
  }
}
