// frontend/src/components/TeamRoster/PlayerRoster.tsx

import * as React from "react";
import clsx from "clsx";
import type { Backend } from "@/types/backend";
import { Position } from "@/types/enums";
import { getFlagUrl } from "@/utils/getFlagUrl";
import { useGameState } from "@/store/GameStateStore";

/**
 * ---------------------------------------------------------------------------
 * Props
 * ---------------------------------------------------------------------------
 */
type Player = Backend.Player;

interface PlayerRosterProps {
  players: Player[];
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
  /** Optional – component now falls back to store values if not provided */
  lineupIds?: number[];
  benchIds?: number[];
}

/**
 * Sorted position groups (5 rows each → 20 total).
 */
const POSITION_ORDER: Position[] = [Position.GK, Position.DF, Position.MF, Position.AT];
const SLOTS_PER_POSITION = 5;

/** Robust numeric id helper (guards against "123" string ids from the API) */
function idNum(p: Pick<Player, "id"> | { id: any }): number {
  const n = Number((p as any).id);
  return Number.isFinite(n) ? n : -1;
}

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export default function PlayerRoster({
  players,
  selectedPlayer,
  onSelectPlayer,
  lineupIds = [],
  benchIds = [],
}: PlayerRosterProps) {
  const store = useGameState();

  // Fallback to store if parent doesn’t pass controlled props
  const effectiveLineup = React.useMemo(
    () => (lineupIds && lineupIds.length ? lineupIds : store.lineupIds),
    [lineupIds, store.lineupIds]
  );
  const effectiveBench = React.useMemo(
    () => (benchIds && benchIds.length ? benchIds : store.reserveIds),
    [benchIds, store.reserveIds]
  );

  const { cycleSelection } = store;

  // Keep a Set for O(1) membership checks and to avoid number/string mismatches
  const lineupSet = React.useMemo(
    () => new Set(effectiveLineup.map((n) => Number(n))),
    [effectiveLineup]
  );
  const benchSet = React.useMemo(
    () => new Set(effectiveBench.map((n) => Number(n))),
    [effectiveBench]
  );

  const grouped = React.useMemo(() => {
    return POSITION_ORDER.map((pos) => {
      // Filter to this position
      const list = players.filter((p) => p.position === pos);

      // Sort strictly by rating DESC within this position (tie-break by name ASC)
      const sortedList = [...list].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.name.localeCompare(b.name);
      });

      // Fill up to 5 rows per position with blanks (never negative)
      const missing = Math.max(0, SLOTS_PER_POSITION - sortedList.length);
      const blanks = Array.from({ length: missing }, (_, i) =>
        ({
          id: `blank-${pos}-${i}`,
          name: "",
          position: pos,
          rating: 0,
          salary: 0,
          nationality: "",
          underContract: false,
        } as unknown as Player)
      );

      return [...sortedList, ...blanks];
    });
  }, [players]);

  const renderPickCell = (p: any) => {
    const isBlank = p.name === "";
    if (isBlank) return <span className="w-[10%] text-right" />;

    const pid = idNum(p);
    const inLineup = lineupSet.has(pid);
    const inBench = benchSet.has(pid);

    // Make the “none” state VISIBLE and clickable with a "+" symbol
    const symbol = inLineup ? "◯" : inBench ? "–" : "＋";
    const title = inLineup
      ? "Move to Reserve"
      : inBench
      ? "Clear (Not called-up)"
      : "Add to Lineup";

    return (
      <button
        type="button"
        title={`Click to cycle: Lineup → Reserve → Clear. ${title}`}
        onClick={(e) => {
          e.stopPropagation();
          const normalized = idNum(p);
          if (normalized >= 0) {
            cycleSelection(normalized);
          }
        }}
        className={clsx(
          "w-[10%] text-right font-semibold cursor-pointer select-none",
          "inline-flex items-center justify-end", // reliable click target
          inLineup && "text-green-700 dark:text-green-300",
          inBench && "text-blue-700 dark:text-blue-300",
          !inLineup && !inBench && "text-gray-400 dark:text-gray-400" // “＋” neutral color
        )}
        aria-label={title}
        data-pid={pid}
      >
        {symbol}
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-lg bg-white p-3 text-xs shadow dark:bg-gray-900">
      {/* Header */}
      <div className="flex border-b border-gray-200 pb-2 font-semibold dark:border-gray-800">
        <span className="w-[35%]">Name</span>
        <span className="w-[20%] text-right">Salary</span>
        <span className="w-[10%] text-right">Rat</span>
        <span className="w-[10%] text-right">🌐</span>
        <span className="w-[10%] text-right">C</span>
        <span className="w-[10%] text-right">Sel</span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {grouped.map((bucket, idx) => {
          const pos = POSITION_ORDER[idx];
          return (
            <div key={pos}>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                {pos}
              </div>

              <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                {bucket.map((p, rowIdx) => {
                  const isBlank = p.name === "";
                  const pid = idNum(p);
                  const isSelected = selectedPlayer ? idNum(selectedPlayer) === pid : false;

                  const isLineup = !isBlank && lineupSet.has(pid);
                  const isBench = !isBlank && benchSet.has(pid);

                  return (
                    <div
                      key={(p as any).id}
                      role="button"
                      className={clsx(
                        "flex items-center px-2 py-[3px] transition-colors",
                        rowIdx % 2 === 0
                          ? "bg-gray-50 dark:bg-gray-800/20"
                          : "bg-white dark:bg-gray-800",
                        isSelected && "bg-yellow-200 dark:bg-yellow-600/40",
                        isLineup && "bg-green-200 dark:bg-green-700/40",
                        isBench && "bg-blue-200 dark:bg-blue-700/40",
                        !isBlank && "hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                      style={{ minHeight: "24px" }}
                      onClick={() => !isBlank && onSelectPlayer(p)}
                    >
                      {/* Name */}
                      <span className="w-[35%] truncate">{p.name}</span>

                      {/* Salary */}
                      <span className="w-[20%] text-right">
                        {isBlank ? "" : `€${Number(p.salary ?? 0).toLocaleString()}`}
                      </span>

                      {/* Rating */}
                      <span className="w-[10%] text-right">{isBlank ? "" : p.rating}</span>

                      {/* Flag */}
                      <span className="w-[10%] text-right">
                        {p.nationality && (
                          <img
                            src={getFlagUrl(p.nationality)}
                            alt={p.nationality}
                            className="inline h-4 w-5"
                          />
                        )}
                      </span>

                      {/* Contract */}
                      <span className="w-[10%] text-right">
                        {isBlank ? "" : p.underContract ? "🔒" : "🆓"}
                      </span>

                      {/* Selection clicker (◯ / – / ＋) */}
                      {renderPickCell(p)}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
