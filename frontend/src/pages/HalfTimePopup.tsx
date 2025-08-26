import * as React from "react";
import { useState, useEffect, MouseEvent, useMemo } from "react";
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
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PauseReason =
  | "HALFTIME"
  | "GK_INJURY"
  | "GK_RED_NEEDS_GK"
  | "INJURY"
  | "COACH_PAUSE";

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
}: HalfTimePopupProps) {
  const [selectedOut, setSelectedOut] = useState<number | null>(null);
  const [selectedIn,   setSelectedIn]  = useState<number | null>(null);

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
    () => bench.some((p) => isGK(p.position)),
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

  // When paused due to GK incident and there is a GK on the bench while no GK is on the field,
  // a GK must be selected from the bench.
  const mustPickGK =
    (pauseReason === "GK_INJURY" || pauseReason === "GK_RED_NEEDS_GK") &&
    gkOnFieldCount === 0 &&
    hasBenchGK;

  // Validation for the substitution button
  let validationMessage: string | null = null;

  // Prevent two GKs on the field: if adding a GK and there is already a GK on field,
  // the outgoing player must be that GK (GK-for-GK swap).
  if (selectedInIsGK && gkOnFieldCount >= 1 && !selectedOutIsGK) {
    validationMessage = "You cannot play with two goalkeepers. Swap GK for GK.";
  }

  // If mustPickGK, then incoming must be a GK.
  if (mustPickGK && selectedIn != null && !selectedInIsGK) {
    validationMessage = "You must select a goalkeeper from the bench.";
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

  // Banner message / guidance based on pauseReason
  const banner = (() => {
    switch (pauseReason) {
      case "GK_INJURY":
        if (gkOnFieldCount === 0 && hasBenchGK) {
          return "Goalkeeper injured. You must bring on a goalkeeper from the bench.";
        }
        if (gkOnFieldCount === 0 && !hasBenchGK) {
          return "Goalkeeper injured. No reserve goalkeeper available — you may continue without a GK or use an outfield player later.";
        }
        return "Goalkeeper injured. Review your lineup and substitutions.";
      case "GK_RED_NEEDS_GK":
        if (gkOnFieldCount === 0 && hasBenchGK) {
          return "Goalkeeper sent off. Consider bringing on a goalkeeper (you'll remain a player down).";
        }
        if (gkOnFieldCount === 0 && !hasBenchGK) {
          return "Goalkeeper sent off. No reserve goalkeeper available — you will continue without a GK.";
        }
        return "Goalkeeper sent off. Review your lineup and substitutions.";
      case "INJURY":
        return "Player injured. You may substitute if you have players remaining.";
      case "COACH_PAUSE":
        return "Coaching pause. Make changes if needed, then resume the match.";
      case "HALFTIME":
      default:
        return "Half-time. Make substitutions if needed, then resume the second half.";
    }
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Match Paused"
      size="lg"
      isLocked={false}
      className="flex flex-col gap-4"
    >
      {/* Guidance banner */}
      <div className="rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 dark:border-yellow-600/70 dark:bg-yellow-900/20 dark:text-yellow-100">
        {banner}
      </div>

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
            title={`On Field ${gkOnFieldCount ? "(GK present)" : "(no GK)"}`}
            players={lineup}
            selected={selectedOut}
            onSelect={canSubstitute && subsRemaining > 0 ? setSelectedOut : noopSelect}
          />

          {/* Bench */}
          <RosterList
            kind="bench"
            title={`Bench ${hasBenchGK ? "(GK available)" : ""}`}
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
}: {
  kind: "lineup" | "bench";
  title: string;
  players: PlayerDTO[];
  selected: number | null;
  onSelect: (id: number | null) => void;
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

  // Always show GK → DF → MF → AT; then rating DESC; then name ASC
  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const ra = posRank(a);
      const rb = posRank(b);
      if (ra !== rb) return ra - rb;
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        {title}
      </p>
      <div className="max-h-40 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
        {sorted.map((p, idx) => {
          // Injured players:
          //  - LINEUP: selectable (must be able to sub OUT)
          //  - BENCH: disabled (cannot sub IN)
          const isDisabled = kind === "bench" ? p.isInjured : false;

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
              {/* Removed duplicate GK badge as requested */}
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
