import React, { useEffect, useState } from "react";
import type { Backend } from "@/types/backend";
import statsService, { type PlayerStat, type PlayerStatsSummary } from "@/services/statsService";
type Player = Backend.Player;

interface PlayerTabProps {
  selectedPlayer: Player | null;
  onRenewContract?: (player: Player) => void;
  onSell?: (player: Player) => void;
  renderActions?: (player: Player) => React.ReactNode; // NEW: For custom action buttons
}

function isContractExpired(player: Player): boolean {
  if (player.underContract === false || player.underContract === undefined) return true;
  if (player.contractUntil) {
    const contractDate = typeof player.contractUntil === "number"
      ? new Date(player.contractUntil)
      : new Date(player.contractUntil);
    return contractDate.getTime() < Date.now();
  }
  return true;
}

function contractDateString(contractUntil: number | string | null | undefined) {
  if (!contractUntil) return "";
  const d = typeof contractUntil === "number"
    ? new Date(contractUntil)
    : new Date(contractUntil);
  return d.toISOString().slice(0, 10);
}

export default function PlayerTab({
  selectedPlayer,
  onRenewContract,
  onSell,
  renderActions, // NEW: Accept custom actions
}: PlayerTabProps) {
  const [stats, setStats] = useState<PlayerStat[] | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [summary, setSummary] = useState<PlayerStatsSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (!selectedPlayer) {
      setStats(null);
      setStatsError(null);
      setSummary(null);
      setSummaryError(null);
      return;
    }

    /* Load per-match rows (optional, useful if you show a list somewhere) */
    setStats(null);
    setStatsError(null);
    setStatsLoading(true);
    statsService
      .getPlayerStats(selectedPlayer.id)
      .then(setStats)
      .catch(() => {
        setStatsError("Could not load stats");
        setStats(null);
      })
      .finally(() => setStatsLoading(false));

    /* Load pre-aggregated summary (used for the numbers below) */
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    statsService
      .getPlayerStatsSummary(selectedPlayer.id)
      .then(setSummary)
      .catch(() => {
        setSummaryError("Could not load stats summary");
        setSummary(null);
      })
      .finally(() => setSummaryLoading(false));
  }, [selectedPlayer]);

  if (!selectedPlayer) {
    return <div className="h-full flex items-center justify-center text-gray-300">Select a player to view details.</div>;
  }

  const contractExpired = isContractExpired(selectedPlayer);

  // Fallbacks if summary isn’t available yet.
  const hasStats = Array.isArray(stats) && stats.length > 0;
  const gamesPlayedFallback = hasStats ? stats.length : 0;
  const goalsFallback = hasStats ? stats.reduce((acc, s) => acc + (s.goals || 0), 0) : 0;
  const redCardsFallback = hasStats ? stats.reduce((acc, s) => acc + (s.red || 0), 0) : 0;
  const injuriesFallback = hasStats ? stats.reduce((acc, s) => acc + (s.injuries || 0), 0) : 0;
  const goalsThisSeasonFallback = 0; // Without season info we can’t compute accurately

  const gamesPlayed = summary?.gamesPlayed ?? gamesPlayedFallback;
  const goals = summary?.goals ?? goalsFallback;
  const redCards = summary?.redCards ?? redCardsFallback;
  const injuries = summary?.injuries ?? injuriesFallback;
  const goalsThisSeason = summary?.goalsThisSeason ?? goalsThisSeasonFallback;

  return (
    <div className="w-full h-full flex flex-col gap-6 p-0">
      {/* Player Info */}
      <div className="flex flex-wrap gap-6 items-baseline w-full">
        <div className="text-xl font-bold tracking-wide">{selectedPlayer.name}</div>
        <div className="flex flex-wrap gap-4 text-base font-medium">
          <span>Rating: {selectedPlayer.rating}</span>
          {selectedPlayer.salary && (
            <span>Salary: €{selectedPlayer.salary.toLocaleString()}</span>
          )}
          {selectedPlayer.nationality && (
            <span>Nationality: {selectedPlayer.nationality}</span>
          )}
          {"contractUntil" in selectedPlayer &&
            typeof selectedPlayer.contractUntil !== "undefined" &&
            selectedPlayer.contractUntil !== null && (
              <span>
                Contract:{" "}
                {contractExpired ? (
                  <span className="text-red-400 font-bold">Expired</span>
                ) : (
                  <>Until {contractDateString(selectedPlayer.contractUntil)}</>
                )}
              </span>
          )}
          {(selectedPlayer.underContract === false ||
            selectedPlayer.contractUntil === null ||
            typeof selectedPlayer.contractUntil === "undefined") && (
              <span className="text-red-400 font-bold">Free Agent</span>
          )}
        </div>
      </div>

      {/* --- Player Statistics Box --- */}
      <div className="bg-[#193661] rounded-xl px-6 py-4 border border-[#1e335a] shadow-lg flex flex-col gap-2 w-full">
        <div className="mb-1 font-bold text-[1.1rem] tracking-wide text-blue-200 uppercase">
          Player Stats
        </div>
        {(statsLoading || summaryLoading) ? (
          <div className="text-blue-300">Loading stats…</div>
        ) : (statsError || summaryError) ? (
          <div className="text-red-300">{summaryError || statsError}</div>
        ) : (
          <>
            <div className="flex justify-between"><span className="font-semibold">Games played:</span><span>{gamesPlayed}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Goals:</span><span>{goals}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Goals this season:</span><span>{goalsThisSeason}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Red cards:</span><span>{redCards}</span></div>
            <div className="flex justify-between"><span className="font-semibold">Injuries:</span><span>{injuries}</span></div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 mt-3">
        {renderActions
          ? renderActions(selectedPlayer) // <-- Custom actions if provided
          : (
            <>
              <button
                className={`bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded font-semibold text-black shadow-md transition
                  ${!contractExpired ? "opacity-50 cursor-not-allowed" : ""}
                `}
                onClick={() => contractExpired && onRenewContract?.(selectedPlayer)}
                disabled={!contractExpired}
              >
                Renew Contract
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold text-white shadow-md transition"
                onClick={() => onSell?.(selectedPlayer)}
              >
                Sell
              </button>
            </>
          )
        }
      </div>
    </div>
  );
}
