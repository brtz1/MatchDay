import * as React from "react";
import clsx from "clsx";
import type { Backend } from "@/types/backend";
import { Position } from "@/types/enums";
import { getFlagUrl } from "@/utils/getFlagUrl";

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
}

/**
 * Sorted position groups (5 rows each → 20 total).
 */
const POSITION_ORDER: Position[] = [
  Position.GK,
  Position.DF,
  Position.MF,
  Position.AT,
];
const SLOTS_PER_POSITION = 5;

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export default function PlayerRoster({
  players,
  selectedPlayer,
  onSelectPlayer,
}: PlayerRosterProps) {
  /**
   * Map players into position buckets and pad with blanks.
   */
  const grouped = React.useMemo(() => {
    return POSITION_ORDER.map((pos) => {
      const list = players.filter((p) => p.position === pos);
      const blanks = Array.from(
        { length: SLOTS_PER_POSITION - list.length },
        (_, i) =>
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
      return [...list, ...blanks];
    });
  }, [players]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-lg bg-white p-3 text-xs shadow dark:bg-gray-900">
      {/* ── Header row */}
      <div className="flex border-b border-gray-200 pb-2 font-semibold dark:border-gray-800">
        <span className="w-[35%]">Name</span>
        <span className="w-[20%] text-right">Salary</span>
        <span className="w-[10%] text-right">Rat</span>
        <span className="w-[10%] text-right">🌐</span>
        <span className="w-[10%] text-right">C</span>
      </div>

      {/* ── Body */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {grouped.map((bucket, idx) => {
          const pos = POSITION_ORDER[idx];
          return (
            <div key={pos}>
              {/* Position label */}
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                {pos}
              </div>

              {/* Player rows */}
              <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
                {bucket.map((p, rowIdx) => {
                  const isSelected = selectedPlayer?.id === p.id;
                  const isBlank = p.name === "";
                  return (
                    <div
                      key={p.id}
                      role="button"
                      className={clsx(
                        "flex items-center px-2 py-[3px] transition-colors",
                        rowIdx % 2 === 0
                          ? "bg-gray-50 dark:bg-gray-800/20"
                          : "bg-white dark:bg-gray-800",
                        isSelected && "bg-yellow-200 dark:bg-yellow-600/40",
                        !isBlank && "hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                      style={{ minHeight: "24px" }}
                      onClick={() => !isBlank && onSelectPlayer(p)}
                    >
                      {/* Name */}
                      <span className="w-[35%] truncate">{p.name}</span>

                      {/* Salary */}
                      <span className="w-[20%] text-right">
                        {isBlank ? "" : `€${p.salary.toLocaleString()}`}
                      </span>

                      {/* Rating */}
                      <span className="w-[10%] text-right">
                        {isBlank ? "" : p.rating}
                      </span>

                      {/* Nationality flag */}
                      <span className="w-[10%] text-right">
                        {p.nationality && (
                          <img
                            src={getFlagUrl(p.nationality)}
                            alt={p.nationality}
                            className="inline h-4 w-5"
                          />
                        )}
                      </span>

                      {/* Contract indicator */}
                      <span className="w-[10%] text-right">
                        {isBlank ? "" : p.underContract ? "🔒" : "🆓"}
                      </span>
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
