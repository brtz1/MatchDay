// frontend/src/pages/TeamRosterPage.tsx

import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useLocation, matchPath } from "react-router-dom";
import { matchdayUrl } from "@/utils/paths";

/* ── Services / store ─────────────────────────────────────────────── */
import { getTeamById } from "@/services/teamService";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";
import { advanceToMatchday } from "@/services/matchService";

/* ── UI ───────────────────────────────────────────────────────────── */
import TopNavBar from "@/components/common/TopNavBar";
import PlayerRoster from "@/components/TeamRoster/PlayerRoster";
import TeamRosterTabs, { TabDefinition } from "@/components/TeamRoster/TeamRosterTabs";
import FormationTab from "@/components/TeamRoster/tabs/FormationTab"; // ← default export (uses GameState store internally)
import PlayerTab from "@/components/TeamRoster/tabs/PlayerTab";
import { ProgressBar } from "@/components/common/ProgressBar";
import GameTab from "@/components/TeamRoster/tabs/GameTab"; // ✅ canonical lowercase path

/* ── Types ────────────────────────────────────────────────────────── */
import type { Backend } from "@/types/backend";
import { isAxiosError } from "axios";
type Player = Backend.Player;

type Team = {
  id: number;
  name: string;
  colors?: { primary: string; secondary: string };
  stadiumCapacity?: number;
  /** Division can arrive as number or enum/string (e.g. "D1", "DIV_1", "DISTRITAL") */
  division?: number | string | null;
  morale?: number;
  coachName?: string;
  players: Player[];
};

/** Normalize division value to a friendly label ("1".."4", "Distrital", or "—") */
function formatDivision(div?: number | string | null): string {
  if (div === null || div === undefined) return "—";
  if (typeof div === "number") return String(div);

  const s = String(div).trim().toUpperCase();

  // Handle Distrital explicitly
  if (s.includes("DIST")) return "Distrital";

  // Try to extract a digit (covers "D1", "DIV_1", "DIVISION_4", etc.)
  const m = s.match(/(\d+)/);
  if (m) return m[1];

  // Fallback to raw string if nothing matched
  return s || "—";
}

export default function TeamRosterPage() {
  const { teamId: teamIdParam } = useParams<{ teamId?: string }>();
  const { currentTeamId } = useTeamContext();

  // Grab the whole GameState API once so we can use optional actions without TS complaining
  const gameState = useGameState() as any;

  const {
    coachTeamId,
    saveGameId,
    bootstrapping,

    // NEW: react to MATCHDAY to jump to Live immediately
    gameStage,
    matchdayType,
    skipCupRoster,

    // grace/timer flags from GameState store
    cameFromResults,
    clearCameFromResults,
    refreshGameState,

    // selection store (used for legend only; PlayerRoster reads the store internally)
    lineupIds,
  } = gameState;

  const navigate = useNavigate();
  const location = useLocation();

  const urlTeamId = teamIdParam ? Number(teamIdParam) : null;
  const coachedId = coachTeamId ?? currentTeamId ?? null;
  const teamId = urlTeamId && urlTeamId > 0 ? urlTeamId : coachedId;

  const [team, setTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [autoCupSim, setAutoCupSim] = useState(false);
  const [autoCupError, setAutoCupError] = useState<string | null>(null);
  const autoCupRef = useRef(false);

  const isCoachTeam = teamId === coachedId;
  const isTeamRosterPage =
    !!matchPath("/team/:id", location.pathname) || !!matchPath("/teams/:id", location.pathname);

  const shouldAutoCup = Boolean(isCoachTeam && skipCupRoster && matchdayType === "CUP" && typeof gameState.currentMatchday === "number");

  const triggerCupAutoSim = useCallback(async () => {
    if (typeof saveGameId !== "number" || Number.isNaN(saveGameId)) {
      setAutoCupError("Missing save information. Reload and try again.");
      return;
    }
    setAutoCupSim(true);
    setAutoCupError(null);
    try {
      await advanceToMatchday(saveGameId);
      navigate(matchdayUrl, { state: { fromFormation: true, autoCupSkip: true } });
    } catch (err) {
      console.error("[TeamRoster] Auto cup simulation failed:", err);
      setAutoCupError("Unable to auto-simulate this cup round. Please retry.");
    } finally {
      setAutoCupSim(false);
    }
  }, [navigate, saveGameId]);

  /* ---------------------------------------------------------------------------
     ALWAYS refresh GameState when landing on this page (and on tab focus).
     This ensures currentMatchday is correct immediately for GameTab.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const matchdayNumber =
      typeof gameState.currentMatchday === "number" ? gameState.currentMatchday : null;

    if (!shouldAutoCup || bootstrapping) {
      if (!shouldAutoCup) {
        autoCupRef.current = false;
        setAutoCupError(null);
        setAutoCupSim(false);
        if (matchdayNumber !== autoCupRef.current) {
          autoCupRef.current = null as unknown as boolean;
        }
      }
      return;
    }

    if (matchdayNumber == null) return;

    if (autoCupRef.current === matchdayNumber) return;

    autoCupRef.current = matchdayNumber as unknown as boolean;
    void triggerCupAutoSim();
  }, [shouldAutoCup, bootstrapping, triggerCupAutoSim, gameState.currentMatchday]);

  useEffect(() => {
    if (bootstrapping) return;

    // Refresh on route (re)entry
    (async () => {
      try {
        await refreshGameState();
      } catch {
        // swallow; page still loads
      }
    })();

    // Also refresh when user returns focus to the tab/window
    const onFocus = () => {
      try {
        refreshGameState();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, bootstrapping]);

  /* ---------------------------------------------------------------------------
     After RESULTS → STANDINGS → back here, refresh GameState so currentMatchday
     is advanced (backend increments during finalize flow).
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!cameFromResults) return;
    (async () => {
      try {
        await refreshGameState();
      } finally {
        // Reset the one-shot flag so toolbar visits to Standings won't auto-refresh here.
        clearCameFromResults();
      }
    })();
  }, [cameFromResults, clearCameFromResults, refreshGameState]);

  /* ---------------------------------------------------------------------------
     NEW: Reset lineup/reserve *visual selection* when arriving from Results.
     Uses either:
       - store flag (cameFromResults), or
       - router state flag (location.state?.cameFromResults)
     Prefers store method `resetFormationSelection()` if present; falls back to
     `resetSelection()` (or manual lineup/reserve clears) and restores default formation.
     Also clears router state to avoid repeated resets.
  --------------------------------------------------------------------------- */
  useEffect(() => {
    const fromRouter = Boolean((location.state as any)?.cameFromResults);
    const shouldReset = Boolean(cameFromResults || fromRouter);
    if (!shouldReset) return;

    try {
      if (typeof gameState.resetFormationSelection === "function") {
        gameState.resetFormationSelection();
      } else {
        if (typeof gameState.resetSelection === "function") {
          gameState.resetSelection();
        } else {
          if (typeof gameState.setLineupIds === "function") gameState.setLineupIds([]);
          if (typeof gameState.setReserveIds === "function") gameState.setReserveIds([]);
        }
        if (typeof gameState.setSelectedFormation === "function") {
          gameState.setSelectedFormation("4-4-2");
        }
      }
    } finally {
      if (fromRouter) {
        // Clear the router flag so a rerender doesn't trigger another reset
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameFromResults, location.state, navigate, location.pathname]);

  /* ---------------------------------------------------------------------------
     NEW: If the backend/socket flips stage to MATCHDAY, jump to Live instantly.
     (Prevents missing early minute ticks if user stayed on Formation/Game tabs.)
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (bootstrapping) return;
    if (gameStage === "MATCHDAY") {
      navigate(matchdayUrl);
    }
  }, [gameStage, bootstrapping, navigate]);

  useEffect(() => {
    if (!teamId || teamId <= 0) {
      console.warn("Invalid or missing team ID — redirecting to home");
      navigate("/", { replace: true });
      return;
    }

    if (bootstrapping || !saveGameId || !coachedId) {
      // GameState not ready yet
      return;
    }

    const loadTeam = async (retries = 3) => {
      setLoading(true);
      for (let i = 0; i < retries; i++) {
        try {
          const data = await getTeamById(teamId, coachedId!);
          if (!data?.players?.length) {
            console.warn(`Team ${teamId} has no players yet (retrying)`);
            throw new Error("Players not ready");
          }
          setTeam({
            ...data,
            morale: data.morale ?? 50,
          });
          break;
        } catch (err: unknown) {
          if (isAxiosError(err) && err.response?.status === 403) {
            console.warn(`403 error loading team ${teamId}`);
            break;
          }
          await new Promise((res) => setTimeout(res, 600));
        }
      }
      setLoading(false);
    };

    loadTeam();
  }, [teamId, navigate, saveGameId, coachedId, bootstrapping]);

  const tabs: TabDefinition[] = isCoachTeam
    ? [
        { value: "overview", label: "Game" },
        { value: "player", label: "Player" },
        { value: "formation", label: "Formation" },
        { value: "finances", label: "Finances" },
      ]
    : [
        { value: "overview", label: "Game" },
        { value: "player", label: "Player" },
      ];

  if (!teamId || !saveGameId || !coachedId) {
    return (
      <p className="mt-6 text-center text-red-500">
        Game not fully initialized — please start a new game.
      </p>
    );
  }

  if (shouldAutoCup) {
    return (
      <>
        {isTeamRosterPage && coachedId && <TopNavBar coachTeamId={coachedId} />}
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-green-700 p-4 text-white">
          <div className="max-w-xl rounded-2xl bg-green-900/70 p-6 text-center shadow-2xl">
            <h1 className="text-2xl font-bold">Cup Round Auto-Simulation</h1>
            <p className="mt-4 text-sm text-white/80">
              Your club has been eliminated from the cup, so this round will play out automatically.
              We&rsquo;ll show you the live ticker and bracket as soon as the AI fixtures finish.
            </p>
            {autoCupError ? (
              <>
                <p className="mt-4 text-sm text-red-200">{autoCupError}</p>
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-green-950 shadow hover:brightness-105 disabled:opacity-60"
                  onClick={triggerCupAutoSim}
                  disabled={autoCupSim}
                >
                  {autoCupSim ? "Retrying..." : "Retry simulation"}
                </button>
              </>
            ) : (
              <div className="mt-6 flex flex-col items-center gap-3">
                <ProgressBar className="w-48" />
                <p className="text-sm text-white/70">
                  Simulating current cup fixtures…
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (loading || !team) {
    return (
      <div className="flex h-screen items-center justify-center bg-green-700">
        <ProgressBar className="w-64" />
      </div>
    );
  }

  const primary = team.colors?.primary ?? "#facc15";
  const secondary = team.colors?.secondary ?? "#000000";
  const divisionLabel = formatDivision(team.division);
  const coachLabel = (team.coachName?.trim() ?? "") || "—";

  return (
    <>
      {isTeamRosterPage && <TopNavBar coachTeamId={coachedId!} />}

      <div className="min-h-screen space-y-4 bg-green-700 p-4 text-white pt-12">
        <div
          className="flex items-center justify-between rounded p-2 shadow"
          style={{ backgroundColor: primary, color: secondary }}
        >
          <h1 className="flex items-center gap-2 text-2xl font-bold">{team.name}</h1>
          <p className="text-xs">
            Division {divisionLabel}&nbsp;|&nbsp;
            Coach {coachLabel} | Morale{" "}
            {typeof team.morale === "number" ? team.morale : "—"}
          </p>
        </div>

        <div className="flex h-[60vh] gap-4">
          <div className="w-[65%]">
            <PlayerRoster
              players={team.players}
              selectedPlayer={selectedPlayer}
              onSelectPlayer={setSelectedPlayer}
              // ⬇️ Do NOT pass lineupIds/benchIds; PlayerRoster uses store directly (avoids stale-prop UI bugs)
            />

            {/* Tiny legend */}
            <div className="mt-1 text-[11px] text-white/80">
              <span className="mr-4">
                Legend: <span className="font-bold text-white">◯</span> Lineup &nbsp;&nbsp;{" "}
                <span className="font-bold text-white">–</span> Reserve
              </span>
              <span>
                Selected starters: <span className="font-semibold">{lineupIds.length}</span> / 11
              </span>
            </div>
          </div>

          <div className="w-[35%]">
            <TeamRosterTabs tabs={tabs}>
              {/* Game tab */}
              <div className="space-y-2 text-sm">
                <GameTab
                  teamId={team.id}
                  teamName={team.name}
                  morale={typeof team.morale === "number" ? team.morale : null}
                />
              </div>

              {/* Player tab */}
              {isCoachTeam ? (
                <PlayerTab
                  selectedPlayer={selectedPlayer}
                  onRenewContract={() => {}}
                  onSell={() => {}}
                />
              ) : (
                <PlayerTab selectedPlayer={selectedPlayer} renderActions={() => null} />
              )}

              {/* Formation tab (coach only) */}
              {isCoachTeam && <FormationTab players={team.players} />}

              {/* Finances tab (coach only) */}
              {isCoachTeam && <div className="text-sm">Financial breakdown coming soon…</div>}
            </TeamRosterTabs>
          </div>
        </div>
      </div>
    </>
  );
}

