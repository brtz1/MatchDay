import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNextMatch, type MatchLite } from "@/services/teamService";
import { useGameState } from "@/store/GameStateStore";

interface GameTabProps {
  /** Team currently being viewed */
  teamId: number;
  /** Used for heading + ESLint usage */
  teamName: string;
  morale: number | null;
}

function cupStageBySeasonMd(md: number): string {
  switch (md) {
    case 3: return "Round of 128";
    case 6: return "Round of 64";
    case 9: return "Round of 32";
    case 12: return "Round of 16";
    case 15: return "Quarterfinal";
    case 18: return "Semifinal";
    case 21: return "Final";
    default: return "—";
  }
}

function safeTeamLabel(name?: string | null, id?: number) {
  if (name && name.trim().length > 0) return name;
  return typeof id === "number" ? `Team ${id}` : "Unknown team";
}

function TeamLink({ id, name }: { id?: number; name?: string | null }) {
  const label = safeTeamLabel(name, id);
  if (typeof id !== "number") return <span className="opacity-80">{label}</span>;
  return (
    <Link to={`/teams/${id}`} className="underline hover:opacity-80">
      {label}
    </Link>
  );
}

/**
 * Best-effort H2H fetcher (now save-aware):
 * 1) Tries to use whatever export exists in @/services/matchService.
 * 2) Falls back to GET /api/matches/last-head-to-head?homeId=&awayId[&saveGameId].
 * Accepts shapes: { text } | { summary } | { result } | string.
 */
async function fetchLastH2H(homeId: number, awayId: number, saveGameId?: number): Promise<string | null> {
  // Try dynamic import of the service to avoid compile errors from missing named exports
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import("@/services/matchService");
    const fn =
      mod?.getLastHeadToHead ??
      mod?.getHeadToHeadSummary ??
      mod?.getLastH2H;

    if (typeof fn === "function") {
      const res = await fn(homeId, awayId, { saveGameId });
      if (!res) return null;
      if (typeof res === "string") return res;
      if (typeof res === "object") {
        if (typeof (res as any).text === "string") return (res as any).text;
        if (typeof (res as any).summary === "string") return (res as any).summary;
        if (typeof (res as any).result === "string") return (res as any).result;
      }
      try {
        return JSON.stringify(res);
      } catch {
        return String(res);
      }
    }
  } catch {
    // ignore and try HTTP fallback
  }

  // HTTP fallback (keep endpoint in sync with your backend)
  try {
    const qs = new URLSearchParams({
      homeId: String(homeId),
      awayId: String(awayId),
    });
    if (typeof saveGameId === "number") {
      qs.set("saveGameId", String(saveGameId));
    }
    const resp = await fetch(`/api/matches/last-head-to-head?${qs.toString()}`);
    if (resp.ok) {
      const data = await resp.json();
      const t = data?.text ?? data?.summary ?? data?.result ?? null;
      return typeof t === "string" ? t : null;
    }
  } catch {
    // network errors -> null
  }
  return null;
}

export default function GameTab({ teamId, teamName, morale }: GameTabProps) {
  const [match, setMatch] = useState<MatchLite | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Read GameState for MD label and to pass active saveGameId to H2H
  const { currentMatchday: seasonMd, matchdayType: seasonType, saveGameId, bootstrapping } = useGameState();

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setError(null);
    setLastResult(null);

    // Fetch for the DISPLAYED TEAM (not the coached team)
    getNextMatch(teamId)
      .then(async (m) => {
        if (cancelled) return;
        setMatch(m ?? null);
        setLoaded(true);

        if (m) {
          try {
            const h2hText = await fetchLastH2H(m.homeTeamId, m.awayTeamId, saveGameId ?? undefined);
            if (!cancelled) setLastResult(h2hText);
          } catch {
            if (!cancelled) setLastResult(null);
          }
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to load next match:", err);
        if (!cancelled) {
          setError("Failed to load next match.");
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // Re-fetch when switching team page OR when matchday/save changes
  }, [teamId, seasonMd, saveGameId, bootstrapping]);

  if (!loaded) return <p>Loading next match...</p>;
  if (error) return <p className="text-error">{error}</p>;
  if (!match) return <p>Next Fixture: —</p>;

  // Prefer GameState; fall back to match payload if needed
  const mdNum =
    typeof seasonMd === "number" && seasonMd > 0
      ? seasonMd
      : match.matchdayNumber ?? undefined;

  const mdType = (seasonType ?? match.matchdayType ?? "LEAGUE") as "LEAGUE" | "CUP";

  const legText =
    mdType === "LEAGUE"
      ? mdNum
        ? mdNum <= 7
          ? "League 1st leg"
          : "League 2nd leg"
        : "League —"
      : `Cup ${mdNum ? cupStageBySeasonMd(mdNum) : "—"}`;

  return (
    <div>
      <p className="mb-1 font-bold text-accent">Next Fixture for {teamName}:</p>

      <p className="text-sm mb-1">{`Matchday ${mdNum ?? "—"}: ${legText}`}</p>

      <p className="text-sm">
        <TeamLink id={match.homeTeamId} name={match.homeTeamName} />{" "}
        <span className="opacity-70">x</span>{" "}
        <TeamLink id={match.awayTeamId} name={match.awayTeamName} />
      </p>

      <p className="text-sm">Referee: {match.refereeName ?? "Unknown"}</p>
      <p className="text-sm">
        Last result: {lastResult ? lastResult : "First match-up!"}
      </p>

      <hr className="my-3" />

      <p className="text-sm">Coach Morale: {morale !== null ? `${morale}%` : "N/A"}</p>
    </div>
  );
}
