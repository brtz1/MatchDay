// frontend/src/pages/StandingsPage.tsx
import * as React from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getCurrentStandings,
  getGameState,
  finalizeStandings,
} from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
import TopNavBar from "@/components/common/TopNavBar";
import { useGameState } from "@/store/GameStateStore";
import { teamUrl } from "@/utils/paths";

/** 🔌 sockets */
import { useSocketEvent } from "@/hooks/useSocket";
import { connectSocket, joinSaveRoom, leaveSaveRoom } from "@/socket";

/* ------------------------------------------------------------------ */
/* Local types (robust to both backend shapes)                         */
/* ------------------------------------------------------------------ */

// Legacy/FE expected row (what the table renders)
type TeamRow = {
  teamId: number;
  name: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
};

type DivisionGroup = {
  division: string;
  teams: TeamRow[]; // we normalize to this no matter what BE returns
};

type StageChangedPayload = {
  gameStage:
    | "ACTION"
    | "MATCHDAY"
    | "HALFTIME"
    | "RESULTS"
    | "STANDINGS"
    | "PENALTIES";
};

export default function StandingsPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { cameFromResults?: boolean } };
  const cameFromResults = Boolean(location.state?.cameFromResults);

  const { coachTeamId, saveGameId: storeSaveId } = useGameState();

  const [resolvedSaveId, setResolvedSaveId] = useState<number | undefined>(
    typeof storeSaveId === "number" && !Number.isNaN(storeSaveId)
      ? storeSaveId
      : undefined,
  );

  const [divisions, setDivisions] = useState<DivisionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /* Resolve save id (robust)                                           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof storeSaveId === "number" && !Number.isNaN(storeSaveId)) {
        setResolvedSaveId(storeSaveId);
        return;
      }
      try {
        const gs = await getGameState();
        if (!cancelled) {
          setResolvedSaveId(
            typeof gs?.currentSaveGameId === "number"
              ? gs.currentSaveGameId
              : undefined,
          );
        }
      } catch {
        if (!cancelled) setResolvedSaveId(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeSaveId]);

  /* ------------------------------------------------------------------ */
  /* Socket room join/leave for this page                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof resolvedSaveId !== "number") return;
    connectSocket(); // idempotent
    let disposed = false;
    (async () => {
      try {
        await joinSaveRoom(resolvedSaveId, { waitAck: true, timeoutMs: 3000 });
      } catch {
        /* non-fatal */
      }
      if (disposed) return;
    })();
    return () => {
      disposed = true;
      void leaveSaveRoom(resolvedSaveId);
    };
  }, [resolvedSaveId]);

  /* ------------------------------------------------------------------ */
  /* Fetch + normalize standings                                        */
  /* ------------------------------------------------------------------ */
  const reloadStandings = useCallback(
    async (sid?: number) => {
      if (typeof sid !== "number") return;
      setLoading(true);
      setError(null);
      try {
        const raw = await getCurrentStandings(sid);
        const normalized: DivisionGroup[] = Array.isArray(raw)
          ? raw.map((div: any) => {
              const division = String(div?.division ?? "");
              const teams: TeamRow[] = Array.isArray(div?.teams)
                ? div.teams.map((t: any) => ({
                    teamId: Number(t.teamId ?? t.id),
                    name: String(t.name ?? ""),
                    played: Number(t.played ?? 0),
                    won: Number(t.won ?? 0),
                    draw: Number(t.draw ?? 0),
                    lost: Number(t.lost ?? 0),
                    goalsFor: Number(t.goalsFor ?? 0),
                    goalsAgainst: Number(t.goalsAgainst ?? 0),
                    goalDifference: Number(
                      t.goalDifference ??
                        (Number(t.goalsFor ?? 0) - Number(t.goalsAgainst ?? 0)),
                    ),
                    points: Number(t.points ?? 0),
                    position: Number(t.position ?? 0),
                  }))
                : Array.isArray(div?.rows)
                ? div.rows.map((r: any) => ({
                    teamId: Number(r.teamId ?? r.id),
                    name: String(r.name ?? ""),
                    played: Number(r.played ?? 0),
                    won: Number(r.wins ?? 0),
                    draw: Number(r.draws ?? 0),
                    lost: Number(r.losses ?? 0),
                    goalsFor: Number(r.gf ?? 0),
                    goalsAgainst: Number(r.ga ?? 0),
                    goalDifference: Number(
                      r.gd ?? (Number(r.gf ?? 0) - Number(r.ga ?? 0)),
                    ),
                    points: Number(r.points ?? 0),
                    position: Number(r.position ?? 0),
                  }))
                : [];
              return { division, teams };
            })
          : [];
        setDivisions(normalized);
      } catch (e) {
        console.error("[Standings] Failed to load standings:", e);
        setError("Failed to load standings.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial load once we know the save id
  useEffect(() => {
    if (typeof resolvedSaveId !== "number") return;
    void reloadStandings(resolvedSaveId);
  }, [resolvedSaveId, reloadStandings]);

  /* ------------------------------------------------------------------ */
  /* Live refresh hooks                                                 */
  /* ------------------------------------------------------------------ */

  // Server tells us standings are ready → refetch now
  useSocketEvent<{ saveGameId?: number }>("standings-updated", (msg) => {
    if (
      typeof resolvedSaveId === "number" &&
      (typeof msg?.saveGameId !== "number" || msg.saveGameId === resolvedSaveId)
    ) {
      void reloadStandings(resolvedSaveId);
    }
  });

  // If we land here before recompute is done, a late stage-changed to STANDINGS/RESULTS should also trigger a refetch
  useSocketEvent<StageChangedPayload>("stage-changed", (p) => {
    if (p?.gameStage === "RESULTS" || p?.gameStage === "STANDINGS") {
      if (typeof resolvedSaveId === "number") {
        void reloadStandings(resolvedSaveId);
      }
    }
  });

  // Small grace refetch if we came directly from RESULTS (covers any missed socket)
  useEffect(() => {
    if (!cameFromResults || typeof resolvedSaveId !== "number") return;
    const t = setTimeout(() => void reloadStandings(resolvedSaveId), 800);
    return () => clearTimeout(t);
  }, [cameFromResults, resolvedSaveId, reloadStandings]);

  /* ------------------------------------------------------------------ */
  /* Auto-return to Team Roster when arriving from RESULTS              */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!cameFromResults) return;
    const sid =
      typeof resolvedSaveId === "number" ? resolvedSaveId : storeSaveId ?? undefined;
    if (!sid || !coachTeamId) return;

    const t = setTimeout(async () => {
      try {
        const res = await finalizeStandings(sid);
        const targetCoach = res?.coachTeamId ?? coachTeamId;
        navigate(teamUrl(targetCoach), { replace: true });
      } catch (e) {
        console.warn("[Standings] finalize failed; routing anyway", e);
        navigate(teamUrl(coachTeamId), { replace: true });
      }
    }, 3000);

    return () => clearTimeout(t);
  }, [cameFromResults, resolvedSaveId, storeSaveId, coachTeamId, navigate]);

  /* ------------------------------------------------------------------ */
  /* Stable ordering in grid                                            */
  /* ------------------------------------------------------------------ */
  const gridDivisions = useMemo(() => {
    const byKey = new Map(divisions.map((d) => [String(d.division), d]));
    return [
      byKey.get("D1") ?? byKey.get("1"),
      byKey.get("D3") ?? byKey.get("3"),
      byKey.get("D2") ?? byKey.get("2"),
      byKey.get("D4") ?? byKey.get("4"),
    ].filter(Boolean) as DivisionGroup[];
  }, [divisions]);

  return (
    <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <TopNavBar coachTeamId={coachTeamId ?? -1} />
      <h1 className="mb-4 text-center text-3xl font-extrabold tracking-tight text-blue-700 drop-shadow-sm dark:text-blue-300">
        League Standings
      </h1>

      {loading ? (
        <ProgressBar className="mx-auto w-64" />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : divisions.length === 0 ? (
        <p className="text-gray-500">No standings available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {gridDivisions.map((div) =>
            div ? <DivisionCard key={String(div.division)} div={div} navigate={navigate} /> : null
          )}
        </div>
      )}
    </div>
  );
}

function DivisionCard({
  div,
  navigate,
}: {
  div: DivisionGroup;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <AppCard
      variant="default"
      className="mb-0 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-200/80 shadow-lg dark:border-blue-900 dark:bg-gradient-to-br dark:from-blue-950 dark:to-blue-800/80"
    >
      <div className="mb-4 flex items-center rounded-lg bg-blue-100 px-4 py-2 shadow-inner dark:bg-blue-900/60">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-blue-700 dark:text-yellow-300">
          {divisionNamePretty(String(div.division))}
        </h2>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white/90 p-0 shadow-inner dark:bg-gray-950/60">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/70">
            <tr className="text-center font-semibold text-blue-700 dark:text-blue-200">
              <th className="px-3 py-2 text-left">Team</th>
              <th>Pts</th>
              <th>Pl</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
            </tr>
          </thead>
          <tbody>
            {div.teams.map((team: TeamRow, idx: number) => (
              <tr
                key={team.teamId}
                className={`transition-colors duration-100 ${
                  idx % 2 === 0
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : "bg-blue-100/60 dark:bg-blue-950/30"
                } hover:bg-yellow-100 dark:hover:bg-yellow-900/30`}
              >
                <td className="px-3 py-2 text-left font-medium">
                  <button
                    className="text-blue-600 underline transition-colors hover:text-yellow-700 dark:text-yellow-300 dark:hover:text-yellow-100"
                    onClick={() => navigate(teamUrl(team.teamId))}
                  >
                    {team.name}
                  </button>
                </td>
                <td className="text-center font-bold">{team.points}</td>
                <td className="text-center">{team.played}</td>
                <td className="text-center">{team.won}</td>
                <td className="text-center">{team.draw}</td>
                <td className="text-center">{team.lost}</td>
                <td className="text-center">{team.goalsFor}</td>
                <td className="text-center">{team.goalsAgainst}</td>
                <td className="text-center">{team.goalDifference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppCard>
  );
}

function divisionNamePretty(division: string) {
  switch (division) {
    case "D1":
    case "1":
      return "Division 1";
    case "D2":
    case "2":
      return "Division 2";
    case "D3":
    case "3":
      return "Division 3";
    case "D4":
    case "4":
      return "Division 4";
    default:
      return division;
  }
}
