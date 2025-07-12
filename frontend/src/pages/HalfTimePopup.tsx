import * as React from "react";
import { useState, MouseEvent } from "react";
import clsx from "clsx";
import type { Backend } from "@/types/backend";
import Modal from "@/components/common/Modal";
import { AppButton } from "@/components/common/AppButton";
import MatchEventFeed, {
  type MatchEvent,
} from "@/components/MatchBroadcast/MatchEventFeed";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

export interface HalfTimePopupProps {
  /** Show / hide the modal. */
  open: boolean;
  /** Close handler (also resumes simulation). */
  onClose: () => void;

  /** Events from minute 0-45 (or 0-105 in ET). */
  events: MatchEvent[];

  /** Current on-field players for the coached team. */
  lineup: Backend.Player[];
  /** Bench players eligible to come on. */
  bench: Backend.Player[];

  /** How many subs remain this matchday (max = 3). */
  subsRemaining: number;

  /**
   * Called for each confirmed substitution.
   * `out` is the id of the player leaving the pitch,
   * `in` is the id of the player coming on.
   */
  onSubstitute: (args: { out: number; in: number }) => void;
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
}: HalfTimePopupProps) {
  /* ────────────────────────────── Local state */
  const [selectedOut, setSelectedOut] = useState<number | null>(null);
  const [selectedIn, setSelectedIn] = useState<number | null>(null);

  /* ────────────────────────────── Helpers */
  function commitSub(e: MouseEvent) {
    e.preventDefault();
    if (!selectedOut || !selectedIn) return;
    onSubstitute({ out: selectedOut, in: selectedIn });
    // reset selections
    setSelectedOut(null);
    setSelectedIn(null);
  }

  const disableCommit =
    !selectedOut ||
    !selectedIn ||
    selectedOut === selectedIn ||
    subsRemaining === 0;

  /* ────────────────────────────── Render */
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Half-Time"
      size="lg"
      isLocked={false}
      className="flex flex-col gap-4"
    >
      {/* Top: event feed */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            Match Events
          </h3>
          <MatchEventFeed events={events} maxHeightRem={18} />
        </div>

        {/* Substitutions */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Substitutions (remaining {subsRemaining})
          </h3>

          {/* Lineup list */}
          <RosterList
            title="On Field"
            players={lineup}
            selected={selectedOut}
            onSelect={setSelectedOut}
          />

          {/* Bench list */}
          <RosterList
            title="Bench"
            players={bench}
            selected={selectedIn}
            onSelect={setSelectedIn}
          />

          <AppButton
            onClick={commitSub}
            disabled={disableCommit}
            className="self-end"
          >
            Confirm Sub
          </AppButton>
        </div>
      </div>

      {/* Footer */}
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
  title,
  players,
  selected,
  onSelect,
}: {
  title: string;
  players: Backend.Player[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
        {title}
      </p>
      <div className="max-h-40 overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
        {players.map((p, idx) => (
          <div
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={clsx(
              "flex cursor-pointer items-center gap-2 px-2 py-[3px] text-xs transition-colors",
              idx % 2 === 0
                ? "bg-gray-50 dark:bg-gray-800/20"
                : "bg-white dark:bg-gray-800",
              selected === p.id &&
                "bg-yellow-200 dark:bg-yellow-600/40"
            )}
          >
            <span className="w-6 text-center font-mono">{p.position}</span>
            <span className="flex-1 truncate">{p.name}</span>
            <span className="w-6 text-right">{p.rating}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
