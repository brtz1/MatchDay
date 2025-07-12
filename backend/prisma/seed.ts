// prisma/seed.ts  – clean dev DB and reseed countries + base clubs

import path from "path";
import fs from "fs";
import prisma from "../src/utils/prisma";

const SALARY_MULTIPLIER = 1_000;

/* ---------------------------------------------------------------- helpers */
function generatePlayerRating(teamRating: number, i: number) {
  const v = Math.floor(Math.random() * 5);
  const sign = i % 2 === 0 ? 1 : -1;
  return Math.max(30, Math.min(99, teamRating + sign * v));
}
function calcSalary(r: number, beh: number) {
  return Math.round(r * SALARY_MULTIPLIER * (1 + (beh - 3) * 0.1));
}

/* ---------------------------------------------------------------- seed countries */
async function seedCountries() {
  const file = path.resolve(__dirname, "../src/data/countries.json");
  const countries = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log("🌍 Seeding countries …");
  await Promise.all(
    countries.map((c: any) =>
      prisma.country.upsert({
        where: { iso2: c.iso2 },
        update: { code: c.code, name: c.name, flag: c.flag, continent: c.continent },
        create: { iso2: c.iso2, code: c.code, name: c.name, flag: c.flag, continent: c.continent },
      }),
    ),
  );
  console.log(`✅ Countries upserted: ${countries.length}`);
}

/* ---------------------------------------------------------------- seed base teams */
async function seedBaseTeamsAndPlayers() {
  const file = path.resolve(__dirname, "../src/data/teams.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log("⚽ Seeding base teams …");
  for (const team of json.teams) {
    await prisma.baseTeam.create({
      data: {
        name: team.name,
        country: team.country,
        rating: team.rating,
        coachName: team.coachName,
        players: {
          create: team.players.map((p: any, idx: number) => {
            const rating = generatePlayerRating(team.rating, idx);
            return {
              name: p.name,
              nationality: p.nationality,
              position: p.position,
              behavior: p.behavior,
              rating,
              salary: calcSalary(rating, p.behavior),
            };
          }),
        },
      },
    });
  }
  console.log(`✅ Base teams seeded: ${json.teams.length}`);
}

/* ---------------------------------------------------------------- main */
async function main() {
  if (process.env.NODE_ENV !== "production") {
    console.log("🧹 Clearing save-game & template tables …");

    await prisma.$transaction([
      /* Save-game layer (children → parents) */
      prisma.gameState.deleteMany(),
      prisma.saveGameMatch.deleteMany(),
      prisma.saveGamePlayer.deleteMany(),
      prisma.saveGameTeam.deleteMany(),
      prisma.saveGame.deleteMany(),

      /* Template layer */
      prisma.basePlayer.deleteMany(),
      prisma.baseTeam.deleteMany(),

      /* Countries last */
      prisma.country.deleteMany(),
    ]);
  }

  await seedCountries();
  await seedBaseTeamsAndPlayers();
}

main()
  .then(() => console.log("🌱 Seed complete"))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
