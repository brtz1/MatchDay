// frontend/src/pages/TeamRosterPage.tsx

import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation, matchPath } from "react-router-dom";

/* ── Services / store ─────────────────────────────────────────────── */
import { getTeamById } from "@/services/teamService";
import { useTeamContext } from "@/store/TeamContext";
import { useGameState } from "@/store/GameStateStore";

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
  const {
    coachTeamId,
    saveGameId,
    bootstrapping,

    // grace/timer flags from GameState store
    cameFromResults,
    clearCameFromResults,
    refreshGameState,

    // selection store
    lineupIds,
    reserveIds,
  } = useGameState();

  const navigate = useNavigate();
  const location = useLocation();

  const urlTeamId = teamIdParam ? Number(teamIdParam) : null;
  const coachedId = coachTeamId ?? currentTeamId ?? null;
  const teamId = urlTeamId && urlTeamId > 0 ? urlTeamId : coachedId;

  const [team, setTeam] = useState<Team | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const [loading, setLoading] = useState(true);

  const isCoachTeam = teamId === coachedId;
  const isTeamRosterPage =
    !!matchPath("/team/:id", location.pathname) || !!matchPath("/teams/:id", location.pathname);

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
              lineupIds={lineupIds}
              benchIds={reserveIds}
            />

            {/* Tiny legend */}
            <div className="mt-1 text-[11px] text-white/80">
              <span className="mr-4">Legend: <span className="font-bold text-white">◯</span> Lineup &nbsp;&nbsp; <span className="font-bold text-white">–</span> Reserve</span>
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
                <PlayerTab
                  selectedPlayer={selectedPlayer}
                  renderActions={() => null}
                />
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
