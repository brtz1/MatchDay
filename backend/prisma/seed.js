"use strict";
// prisma/seed.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
const SALARY_MULTIPLIER = 1000;
function generatePlayerRating(teamRating, index) {
    const variance = Math.floor(Math.random() * 5);
    const sign = index % 2 === 0 ? 1 : -1;
    return Math.max(30, Math.min(99, teamRating + (sign * variance)));
}
function calculateSalary(rating, behavior) {
    const multiplier = 1 + (behavior - 3) * 0.1;
    return Math.round(rating * SALARY_MULTIPLIER * multiplier);
}
async function main() {
    const filePath = path_1.default.resolve(__dirname, '../src/data/teams.json');
    console.log('Resolved file path:', filePath);
    const raw = fs_1.default.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    for (const team of json.teams) {
        const createdTeam = await prisma.baseTeam.create({
            data: {
                name: team.name,
                country: team.country,
                rating: team.rating,
                coachName: team.coachName,
                players: {
                    create: team.players.map((player, index) => {
                        const rating = generatePlayerRating(team.rating, index);
                        return {
                            name: player.name,
                            nationality: player.nationality,
                            position: player.position,
                            behavior: player.behavior,
                            rating,
                            salary: calculateSalary(rating, player.behavior),
                        };
                    }),
                },
            },
        });
        console.log(`✅ Created base team: ${createdTeam.name}`);
    }
}
main()
    .then(() => {
    console.log('🌱 Base team seed complete');
    return prisma.$disconnect();
})
    .catch((e) => {
    console.error('❌ Error during base team seed:', e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=seed.js.map