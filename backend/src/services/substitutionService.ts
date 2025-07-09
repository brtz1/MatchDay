import prisma from '../utils/prisma';

export async function getMatchLineup(matchId: number) {
  const matchState = await prisma.matchState.findUnique({ where: { matchId } });
  if (!matchState) throw new Error('No match state');

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { players: true } },
      awayTeam: { include: { players: true } },
    },
  });

  if (!match) throw new Error('Match not found');

  const events = await prisma.matchEvent.findMany({
    where: { matchId },
    orderBy: { minute: 'asc' },
  });

  return {
    ...matchState,
    homePlayers: match.homeTeam.players,
    awayPlayers: match.awayTeam.players,
    events,
  };
}

export async function submitSubstitution(
  matchId: number,
  team: 'home' | 'away',
  outPlayerId: number,
  inPlayerId: number
) {
  const state = await prisma.matchState.findUnique({ where: { matchId } });
  if (!state) throw new Error('No match state');

  const isHome = team === 'home';
  const lineup = isHome ? [...state.homeLineup] : [...state.awayLineup];
  const reserves = isHome ? [...state.homeReserves] : [...state.awayReserves];
  const subsMade = isHome ? state.homeSubsMade : state.awaySubsMade;

  if (subsMade >= 3) throw new Error('Max substitutions reached');
  if (!lineup.includes(outPlayerId)) throw new Error('Out player not in lineup');
  if (!reserves.includes(inPlayerId)) throw new Error('In player not in reserves');

  const updatedLineup = lineup.map(id => (id === outPlayerId ? inPlayerId : id));
  const updatedReserves = reserves.filter(id => id !== inPlayerId).concat(outPlayerId);

  await prisma.matchState.update({
    where: { matchId },
    data: isHome
      ? { homeLineup: updatedLineup, homeReserves: updatedReserves, homeSubsMade: subsMade + 1 }
      : { awayLineup: updatedLineup, awayReserves: updatedReserves, awaySubsMade: subsMade + 1 },
  });

  return true;
}

export async function resumeMatch(matchId: number) {
  await prisma.matchState.update({
    where: { matchId },
    data: { isPaused: false },
  });
}

export async function runAISubstitutions(matchId: number) {
  const state = await prisma.matchState.findUnique({ where: { matchId } });
  if (!state) return;

  const events = await prisma.matchEvent.findMany({ where: { matchId } });

  for (const side of ['home', 'away'] as const) {
    const isHome = side === 'home';
    let lineup = isHome ? [...state.homeLineup] : [...state.awayLineup];
    let reserves = isHome ? [...state.homeReserves] : [...state.awayReserves];
    let subsMade = isHome ? state.homeSubsMade : state.awaySubsMade;

    if (subsMade >= 3 || reserves.length === 0) continue;

    const injured = events.filter(
      e => e.eventType === 'INJURY' && e.playerId && lineup.includes(e.playerId)
    );

    for (const e of injured) {
      if (subsMade >= 3 || reserves.length === 0) break;
      const out = e.playerId!;
      const sub = reserves.shift()!;
      lineup = lineup.map(id => (id === out ? sub : id));
      subsMade++;
    }

    while (subsMade < 3 && reserves.length > 0) {
      const out = lineup[Math.floor(Math.random() * lineup.length)];
      const sub = reserves.shift()!;
      lineup = lineup.map(id => (id === out ? sub : id));
      subsMade++;
    }

    await prisma.matchState.update({
      where: { matchId },
      data: isHome
        ? { homeLineup: lineup, homeReserves: reserves, homeSubsMade: subsMade }
        : { awayLineup: lineup, awayReserves: reserves, awaySubsMade: subsMade },
    });
  }
}
