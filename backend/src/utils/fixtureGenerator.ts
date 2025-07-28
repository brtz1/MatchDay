import { SaveGameTeam, MatchdayType } from "@prisma/client";

/**
 * Generates a double round-robin fixture list for a list of 8 teams.
 * Each team plays the others twice (home and away) = 14 matchday.
 */
export function generateLeagueFixtures(teams: SaveGameTeam[]) {
  if (teams.length !== 8) {
    throw new Error("League fixture generator requires exactly 8 teams.");
  }

  const fixtures: {
    matchdayNumber: number;
    matchdayType: MatchdayType;
    homeTeamId: number;
    awayTeamId: number;
  }[] = [];

  const matchups: { home: number; away: number }[] = [];

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchups.push({ home: teams[i].id, away: teams[j].id });
      matchups.push({ home: teams[j].id, away: teams[i].id }); // reverse fixture
    }
  }

  // Shuffle matchups randomly
  for (let i = matchups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
  }

  const totalMatchday = 14;
  const matchesPerMatchday = 4;

  for (let matchdayNumber = 1; matchdayNumber <= totalMatchday; matchdayNumber++) {
    for (let i = 0; i < matchesPerMatchday; i++) {
      const match = matchups.pop();
      if (!match) break;
      fixtures.push({
        matchdayNumber,
        matchdayType: MatchdayType.LEAGUE,
        homeTeamId: match.home,
        awayTeamId: match.away,
      });
    }
  }

  return fixtures;
}

/**
 * Generates a single-elimination cup fixture list.
 * Starts with 128 teams → 7 rounds
 */
export function generateCupFixtures(teams: SaveGameTeam[]) {
  if (teams.length !== 128) {
    throw new Error("Cup fixture generator requires exactly 128 teams.");
  }

  const fixtures: {
    matchdayNumber: number;
    matchdayType: MatchdayType;
    homeTeamId: number;
    awayTeamId: number;
  }[] = [];

  // Shuffle teams for random draw
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  let currentMatchday = 3; // Start at matchday 3 to interleave with league
  let currentTeams = shuffled;

  while (currentTeams.length >= 2) {
    const nextRoundTeams: SaveGameTeam[] = [];

    for (let i = 0; i < currentTeams.length; i += 2) {
      const home = currentTeams[i];
      const away = currentTeams[i + 1];

      fixtures.push({
        matchdayNumber: currentMatchday,
        matchdayType: MatchdayType.CUP,
        homeTeamId: home.id,
        awayTeamId: away.id,
      });

      nextRoundTeams.push(home); // placeholder winner
    }

    currentMatchday += 3;
    currentTeams = nextRoundTeams;
  }

  return fixtures;
}
