import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

/* ── Services / store ─────────────────────────────────────────────── */
import teamService from "@/services/teamService";
import { useTeamContext } from "@/store/TeamContext";

/* ── UI ───────────────────────────────────────────────────────────── */
import TeamRosterToolbar from "@/components/TeamRoster/TeamRosterToolbar";
import PlayerRoster      from "@/components/TeamRoster/PlayerRoster";
import type { TabDefinition } from "@/components/TeamRoster/TeamRosterTabs"
import { ProgressBar }   from "@/components/common/ProgressBar";
import { getFlagUrl }    from "@/utils/getFlagUrl";

/* ── Types (no direct Prisma import) ──────────────────────────────── */
import type { Backend } from "@/types/backend";
import TeamRosterTabs from "@/components/TeamRoster/TeamRosterTabs";
type Player = Backend.Player;
type Team   = Backend.Team & {
  players: Player[];
  coach?: { name: string; morale: number };
};

/* ── Component ────────────────────────────────────────────────────── */
export default function TeamRosterPage() {
  /* router / context */
  const { teamId: teamIdParam } = useParams<{ teamId?: string }>();
  const { currentTeamId }       = useTeamContext();
  const navigate = useNavigate();

  const numericId = teamIdParam ? Number(teamIdParam) : NaN;
  const teamId    = !Number.isNaN(numericId) ? numericId : currentTeamId;

  /* local state */
  const [team, setTeam]                 = useState<Team | null>(null);
  const [selectedPlayer, setSelected]   = useState<Player | null>(null);
  const [loading, setLoading]           = useState(true);

  /* fetch team (with retry if backend is still warming up) */
  useEffect(() => {
    if (!teamId) {
      navigate("/", { replace: true });
      return;
    }

    (async function bootstrap(retries = 3) {
      setLoading(true);
      for (let i = 0; i < retries; i++) {
        try {
          const data = await teamService.getTeamById(teamId);
          if (!data?.players?.length) throw new Error("Players not ready");
          setTeam(data);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      setLoading(false);
    })();
  }, [teamId, navigate]);

  /* early exits */
  if (!teamId) {
    return (
      <p className="mt-6 text-center text-red-500">
        No valid team ID – please start a new game.
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

  /* colours & tab meta */
  const primary   = team.primaryColor   ?? "#facc15";
  const secondary = team.secondaryColor ?? "#000000";
const tabs: TabDefinition[] = [
  { value: "overview",  label: "Game"      },
  { value: "player",    label: "Player"    },
  { value: "formation", label: "Formation" },
  { value: "finances",  label: "Finances"  },
];

  /* render */
  return (
    <div className="min-h-screen space-y-4 bg-green-700 p-4 text-white">
      {/* banner */}
      <div
        className="flex items-center justify-between rounded p-2 shadow"
        style={{ backgroundColor: primary, color: secondary }}
      >
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {team.name}
          {team.country && (
            <img
              src={getFlagUrl(team.country)}
              alt={team.country}
              className="h-4 w-6"
            />
          )}
        </h1>
        <p className="text-xs">
          Division {team.division} &nbsp;|&nbsp; Coach 
          {team.coach?.name ?? "You"} &nbsp;|&nbsp; Morale 
          {team.coach?.morale ?? "–"}
        </p>
      </div>

      {/* toolbar */}
      <TeamRosterToolbar />

      {/* layout */}
      <div className="flex h-[60vh] gap-4">
        {/* roster */}
        <div className="w-[65%]">
          <PlayerRoster
            players={team.players}
            selectedPlayer={selectedPlayer}
            onSelectPlayer={setSelected}
          />
        </div>

        {/* side-panel */}
        <div className="w-[35%]">
          <TeamRosterTabs tabs={tabs}>
            {/* ── Overview ─────────────────────────────── */}
            <div className="space-y-2 text-sm">
              <p>
                Budget:&nbsp;
                <span className="font-semibold">
                  €{team.budget?.toLocaleString() ?? "—"}
                </span>
              </p>
              <p>
                Stadium:&nbsp;
                <span className="font-semibold">
                  {team.stadiumCapacity ?? "—"}
                </span>
              </p>
              <p>Next-fixture &amp; morale widgets coming soon…</p>
            </div>

            {/* ── Player details ──────────────────────── */}
            <div className="text-sm">
              {selectedPlayer ? (
                <ul className="space-y-1">
                  <li>
                    Rating:&nbsp;
                    <strong>{selectedPlayer.rating}</strong>
                  </li>
                  <li>
                    Salary:&nbsp;
                    <strong>
                      €{selectedPlayer.salary.toLocaleString()}
                    </strong>
                  </li>
                  <li>Nationality: {selectedPlayer.nationality}</li>
                </ul>
              ) : (
                <p>Select a player to view details.</p>
              )}
            </div>

            {/* ── Formation ───────────────────────────── */}
            <div className="text-sm">Formation editor coming soon…</div>

            {/* ── Finances ────────────────────────────── */}
            <div className="text-sm">Financial breakdown coming soon…</div>
          </TeamRosterTabs>
        </div>
      </div>
    </div>
  );
}
