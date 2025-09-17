// backend/src/services/matchdayEnsure.ts
import prisma from "../utils/prisma";
import type { MatchdayType } from "@prisma/client";

export async function ensureMatchday(
  saveGameId: number,
  number: number,
  type: MatchdayType,
  roundLabel?: string | null,
) {
  // Serializable TX prevents race when /advance is pressed twice quickly.
  return prisma.$transaction(
    async (tx) => {
      // 1) Make sure the Matchday row exists (or update its type/label if it already does)
      const md = await tx.matchday.upsert({
        where: { matchday_save_number_unique: { saveGameId, number } },
        update: { type, ...(roundLabel ? { roundLabel } : {}) },
        create: { saveGameId, number, type, ...(roundLabel ? { roundLabel } : {}) },
      });

      return md;
    },
    { isolationLevel: "Serializable" } // Postgres supported
  );
}
