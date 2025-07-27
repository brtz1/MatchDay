import prisma from './prisma';
import { DivisionTier } from '@prisma/client';

/** Helper to get a random integer between min and max (inclusive) */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Rating bounds per division */
const divisionRatingRanges: Record<DivisionTier, [number, number]> = {
  D1: [38, 47],
  D2: [28, 40],
  D3: [18, 30],
  D4: [8, 20],
  DIST: [1, 8],
};

/**
 * Creates a new SaveGame snapshot from all BaseTeam/BasePlayer entries.
 * Assigns teams to divisions by strength, gives new ratings, and draws a random D4 team as coach.
 */
export async function createSaveGameFromBase(
  saveName: string,
  coachName?: string
): Promise<{
  saveGameId: number;
  userTeamId: number;
  divisionPreview: string[];
}> {
  // 1. Create SaveGame record
  const save = await prisma.saveGame.create({
    data: {
      name: saveName,
      coachName: coachName ?? '',
    },
  });

  // 2. Load all base teams (sorted by rating descending)
  const baseTeams = await prisma.baseTeam.findMany({
    include: { players: true },
    orderBy: { rating: 'desc' },
  });

  // 3. Assign divisions by index
  const totalTeams = baseTeams.length;
  const divisions: DivisionTier[] = [];

  for (let i = 0; i < totalTeams; i++) {
    if (i < 8) divisions.push(DivisionTier.D1);
    else if (i < 16) divisions.push(DivisionTier.D2);
    else if (i < 24) divisions.push(DivisionTier.D3);
    else if (i < 32) divisions.push(DivisionTier.D4);
    else divisions.push(DivisionTier.DIST);
  }

  const divisionPreview: string[] = [];
  const d4TeamIds: number[] = [];
  let userTeamId: number = -1;

  for (let i = 0; i < baseTeams.length; i++) {
    const baseTeam = baseTeams[i];
    const division = divisions[i];
    const [minRating, maxRating] = divisionRatingRanges[division];
    const newTeamRating = randomInRange(minRating, maxRating);

    // 4. Create SaveGameTeam with new randomized rating
    const saveTeam = await prisma.saveGameTeam.create({
      data: {
        saveGameId: save.id,
        baseTeamId: baseTeam.id,
        name: baseTeam.name,
        division,
        morale: 75,
        currentSeason: 1,
        rating: newTeamRating,
        localIndex: i,
      },
    });

    if (division === DivisionTier.D4) {
      d4TeamIds.push(saveTeam.id);
    }

    // 5. Generate players with rating based on team rating
    for (let j = 0; j < baseTeam.players.length; j++) {
      const p = baseTeam.players[j];

      // Logic: player rating = team rating +/- 2, max 50, min 1
      let rating = p.rating;
      const delta = randomInRange(-2, 2);
      rating = Math.max(1, Math.min(50, newTeamRating + delta));

      await prisma.saveGamePlayer.create({
        data: {
          saveGameId: save.id,
          basePlayerId: p.id,
          name: p.name,
          position: p.position,
          rating,
          salary: Math.round(rating * 1000), // Can be tuned
          behavior: p.behavior ?? randomInRange(1, 5),
          contractUntil: 1,
          teamId: saveTeam.id,
          localIndex: j,
        },
      });
    }
  }

  // 6. Pick a random D4 team to coach
  if (d4TeamIds.length === 0) {
    throw new Error("No teams in Division 4 to assign as user team.");
  }

  const randomIndex = Math.floor(Math.random() * d4TeamIds.length);
  userTeamId = d4TeamIds[randomIndex];

  // 7. Generate division preview string
  for (const div of [DivisionTier.D1, DivisionTier.D2, DivisionTier.D3, DivisionTier.D4]) {
    const names = baseTeams
      .filter((_, idx) => divisions[idx] === div)
      .map((t) => t.name);
    divisionPreview.push(`${div}: ${names.join(', ')}`);
  }

  return {
    saveGameId: save.id,
    userTeamId,
    divisionPreview,
  };
}

export default createSaveGameFromBase;
