// frontend/src/pages/HalfTimePopup.tsx

import React, { useState, useEffect, MouseEvent, useMemo } from "react";
import clsx from "clsx";
import Modal from "@/components/common/Modal";
import { AppButton } from "@/components/common/AppButton";
import MatchEventFeed, { type MatchEvent } from "@/components/MatchBroadcast/MatchEventFeed";

/* -------------------------------------------------------------------------- */
/* Local DTO – used only in live match view / half-time subs                  */
/* -------------------------------------------------------------------------- */

export interface PlayerDTO {
  id: number;
  name: string;
  position: string;
  rating: number;
  isInjured: boolean;
  /** Optional: when true, player is not eligible to appear on bench (e.g., red/injury) */
  unavailable?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PauseReason =
  | "HALFTIME"
  | "GK_INJURY"
  | "GK_RED_NEEDS_GK"
  | "INJURY"
  | "COACH_PAUSE"
  // ✅ allow ET half-time reason coming from the engine/FE
  | "ET_HALF";

/** Distinguish standard half-time vs extra-time half-time (UI only) */
export type HalfTimeMode = "HT" | "ET";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

export interface HalfTimePopupProps {
  open: boolean;
  onClose: () => void;
  events: MatchEvent[];
  lineup: PlayerDTO[];
  bench: PlayerDTO[];
  subsRemaining: number;
  onSubstitute: (args: { out: number; in: number }) => void;
  canSubstitute: boolean;
  pauseReason?: PauseReason;

  /** Incident player info (for injury / GK red/injury) */
  incidentPlayer?: { id: number; name: string; position?: string; rating?: number };

  /** Label ET half-time explicitly (caller may omit; we infer from pauseReason === 'ET_HALF') */
  mode?: HalfTimeMode;

  /** Optional scoreboard/team metadata for the paused match */
  matchMeta?: {
    homeTeam: string;
    awayTeam: string;
    homeGoals: number;
    awayGoals: number;
  };

  /** Name of the team whose lineup/bench we are editing */
  focusTeamName?: string;
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function HalfTimePopup({
  open,
  onClose,
  events,
  lineup,
  bench,
  subsRemaining,
  onSubstitute,
  canSubstitute,
  pauseReason,
  incidentPlayer,
  mode,
  matchMeta,
  focusTeamName,
}: HalfTimePopupProps) {
  const [selectedOut, setSelectedOut] = useState<number | null>(null);
  const [selectedIn,  setSelectedIn]  = useState<number | null>(null);

  // If mode not provided, infer ET vs HT from pauseReason
  const effectiveMode: HalfTimeMode = mode ?? (pauseReason === "ET_HALF" ? "ET" : "HT");

  // Reset selections when reopened/disabled or out of subs
  useEffect(() => {
    if (!open || !canSubstitute || subsRemaining === 0) {
      setSelectedOut(null);
      setSelectedIn(null);
    }
  }, [open, canSubstitute, subsRemaining]);

  const isGK = (pos?: string) => (pos || "").toUpperCase() === "GK";

  const gkOnFieldCount = useMemo(
    () => lineup.filter((p) => isGK(p.position)).length,
    [lineup]
  );
  const hasBenchGK = useMemo(
    () => bench.some((p) => isGK(p.position) && !p.isInjured && !p.unavailable),
    [bench]
  );

  const selectedOutIsGK = useMemo(
    () => (selectedOut != null ? isGK(lineup.find((p) => p.id === selectedOut)?.position) : false),
    [selectedOut, lineup]
  );
  const selectedInIsGK = useMemo(
    () => (selectedIn != null ? isGK(bench.find((p) => p.id === selectedIn)?.position) : false),
    [selectedIn, bench]
  );

  // Validation for the substitution button (mirror backend constraints for UX)
  let validationMessage: string | null = null;
  if (selectedInIsGK && gkOnFieldCount >= 1 && !selectedOutIsGK) {
    validationMessage = "You cannot play with two goalkeepers. Swap GK for GK.";
  }
  if (selectedOutIsGK && !selectedInIsGK) {
    validationMessage = "Goalkeeper can only be substituted by another goalkeeper.";
  }

  function commitSub(e: MouseEvent) {
    e.preventDefault();
    if (selectedOut == null || selectedIn == null) return;
    if (validationMessage) return;
    onSubstitute({ out: selectedOut, in: selectedIn });
    setSelectedOut(null);
    setSelectedIn(null);
  }

  const disableCommit =
    !canSubstitute ||
    selectedOut == null ||
    selectedIn == null ||
    selectedOut === selectedIn ||
    subsRemaining <= 0 ||
    !!validationMessage;

  const helperText =
    !canSubstitute
      ? "You can only make substitutions for the team you coach."
      : subsRemaining <= 0
      ? "No substitutions remaining (max 3)."
      : selectedOut == null || selectedIn == null
      ? "Select one player on the field and one from the bench."
      : selectedOut === selectedIn
      ? "Choose two different players."
      : validationMessage ?? "";

  // Friendly guidance based on pauseReason (no enforcement)
  const banner = (() => {
    switch (pauseReason) {
      case "GK_INJURY":
        if (gkOnFieldCount === 0 && hasBenchGK) {
          return "Goalkeeper injured. Tip: you can bring on a goalkeeper from the bench (optional).";
        }
        if (gkOnFieldCount === 0 && !hasBenchGK) {
          return "Goalkeeper injured. No reserve goalkeeper available — you may continue without a GK.";
        }
        return "Goalkeeper injured. Review your lineup and substitutions if you wish.";
      case "GK_RED_NEEDS_GK":
        if (gkOnFieldCount === 0 && hasBenchGK) {
          return "Goalkeeper sent off. Tip: you can bring on a goalkeeper now (optional).";
        }
        if (gkOnFieldCount === 0 && !hasBenchGK) {
          return "Goalkeeper sent off. No reserve goalkeeper available — you will continue without a GK.";
        }
        return "Goalkeeper sent off. Review your lineup and substitutions if you wish.";
      case "INJURY":
        return "Player injured. You may substitute, or resume the match without a sub.";
      case "COACH_PAUSE":
        return "Coaching pause. Make changes if needed, then resume the match.";
      case "HALFTIME":
      case "ET_HALF":
      default: {
        if (effectiveMode === "ET") {
          return "Extra time half-time. Make substitutions if needed, then resume extra time.";
        }
        return "Half-time. Make substitutions if needed, then resume the second half.";
      }
    }
  })();

  const normalizePos = (pos?: string) => {
    const s = (pos || "").toUpperCase();
    if (s === "G" || s === "GOALKEEPER") return "GK";
    if (s === "D" || s === "DEF" || s === "DEFENDER") return "DF";
    if (s === "M" || s === "MID" || s === "MIDFIELDER") return "MF";
    if (s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST") return "AT";
    return s || "MF";
  };

  // Incident header (optional)
  const incidentHeader = (() => {
    if (!incidentPlayer) return null;
    const pos = normalizePos(incidentPlayer.position);
    const rating =
      typeof incidentPlayer.rating === "number" && !Number.isNaN(incidentPlayer.rating)
        ? `, ${incidentPlayer.rating}`
        : "";
    if (pauseReason === "INJURY" || pauseReason === "GK_INJURY") {
      return (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-600/70 dark:bg-red-900/20 dark:text-red-100">
          <span className="mr-1">🚑</span>
          <strong>{incidentPlayer.name}</strong>
          {` (${pos}${rating})`} got injured.
        </div>
      );
    }
    if (pauseReason === "GK_RED_NEEDS_GK") {
      return (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-600/70 dark:bg-red-900/20 dark:text-red-100">
          <span className="mr-1">🟥</span>
          GK sent off: <strong>{incidentPlayer.name}</strong>
          {` (${pos}${rating})`}
        </div>
      );
    }
    return null;
  })();

  // Title: show ET label when applicable
  const titleText = effectiveMode === "ET" ? "Extra Time — Half-time" : "Match Paused";

  const scoreboard = matchMeta ? (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 shadow-sm dark:border-blue-600/60 dark:bg-blue-900/20 dark:text-blue-100">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">
          <div className="text-xs uppercase tracking-wide text-blue-800/70 dark:text-blue-100/70">
            Home
          </div>
          <div>{matchMeta.homeTeam}</div>
        </div>
        <div className="text-3xl font-black tracking-wide">
          <span>{matchMeta.homeGoals}</span>
          <span className="mx-2 text-base font-medium">-</span>
          <span>{matchMeta.awayGoals}</span>
        </div>
        <div className="text-right text-sm font-semibold">
          <div className="text-xs uppercase tracking-wide text-blue-800/70 dark:text-blue-100/70">
            Away
          </div>
          <div>{matchMeta.awayTeam}</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleText}
      size="lg"
      isLocked={false}
      className="flex flex-col gap-4"
    >
      {/* Incident header (optional) */}
      {incidentHeader}

      {/* Guidance banner */}
      <div className="rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:border-yellow-600/70 dark:bg-yellow-900/20 dark:text-yellow-100">
        {banner}
      </div>

      {scoreboard}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Left: Events */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Match Events</h3>
          <MatchEventFeed events={events} maxHeightRem={18} />
        </div>

        {/* Right: Substitutions */}
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Substitutions <span className="opacity-70">(remaining {subsRemaining})</span>
            </h3>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Max 3 per match
            </p>
          </div>

          {/* On Field */}
          <RosterList
            kind="lineup"
            title={`On Field (${lineup.length})`}
            teamLabel={focusTeamName}
            players={lineup}
            selected={selectedOut}
            onSelect={canSubstitute ? setSelectedOut : noopSelect}
          />

          {/* Bench (injured/unavailable filtered OUT completely) */}
          <RosterList
            kind="bench"
            title={`Bench (${bench.length})`}
            teamLabel={focusTeamName}
            players={bench}
            selected={selectedIn}
            onSelect={canSubstitute && subsRemaining > 0 ? setSelectedIn : noopSelect}
          />

          <div className="flex items-center justify-between">
            <p
              className={clsx(
                "text-xs",
                validationMessage ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"
              )}
            >
              {selectedOut != null && selectedIn != null ? (
                <>
                  Selected: <strong>#{selectedOut}</strong> → <strong>#{selectedIn}</strong>
                  {validationMessage ? <span className="ml-2">• {validationMessage}</span> : null}
                </>
              ) : (
                <span className="opacity-80">{helperText}</span>
              )}
            </p>

            {canSubstitute && (
              <AppButton onClick={commitSub} disabled={disableCommit}>
                Confirm Sub
              </AppButton>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <AppButton variant="ghost" onClick={onClose}>
          Resume Match
        </AppButton>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Helper – RosterList                                                        */
/* -------------------------------------------------------------------------- */

function RosterList({
  kind,
  title,
  players,
  selected,
  onSelect,
  teamLabel,
}: {
  kind: "lineup" | "bench";
  title: string;
  players: PlayerDTO[];
  selected: number | null;
  onSelect: (id: number | null) => void;
  teamLabel?: string;
}) {
  const normalizePos = (pos?: string) => {
    const s = (pos || "").toUpperCase();
    if (s === "G" || s === "GOALKEEPER") return "GK";
    if (s === "D" || s === "DEF" || s === "DEFENDER") return "DF";
    if (s === "M" || s === "MID" || s === "MIDFIELDER") return "MF";
    if (s === "F" || s === "FW" || s === "ATT" || s === "ATTACKER" || s === "ST") return "AT";
    return s || "MF";
  };

  const POS_ORDER: Record<string, number> = { GK: 0, DF: 1, MF: 2, AT: 3 };
  const posRank = (p: PlayerDTO) => POS_ORDER[normalizePos(p.position)] ?? 99;

  // For bench: remove ineligible players completely (injured or explicitly unavailable)
  const visible = useMemo(() => {
    if (kind !== "bench") return players;
    return players.filter((p) => !p.isInjured && !p.unavailable);
  }, [kind, players]);

  // Always show GK → DF → MF → AT; then rating DESC; then name ASC
  const sorted = useMemo(() => {
    return [...visible].sort((a, b) => {
      const ra = posRank(a);
      const rb = posRank(b);
      if (ra !== rb) return ra - rb;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });
  }, [visible]);

  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        {title}
      </p>
      {teamLabel ? (
        <p className="mb-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {teamLabel}
        </p>
      ) : null}
      <div className="max-h-40 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
        {sorted.map((p, idx) => {
          // Fallback safety: if an ineligible player still slips through, disable the button.
          const isDisabled =
            kind === "bench" ? p.isInjured || p.unavailable === true : false;

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => !isDisabled && onSelect(p.id)}
              className={clsx(
                "flex w-full items-center gap-2 px-2 py-[6px] text-left text-xs transition-colors",
                idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/20" : "bg-white dark:bg-gray-800",
                selected === p.id && "bg-yellow-200 dark:bg-yellow-600/40",
                isDisabled
                  ? "cursor-not-allowed line-through text-red-600 dark:text-red-400"
                  : p.isInjured && kind === "lineup"
                  ? "text-red-600 dark:text-red-400"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <span className="w-6 text-center font-mono">{normalizePos(p.position)}</span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="w-6 text-right">{p.rating}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function noopSelect(_: number | null) {
  /* no-op when user can't substitute */
}
