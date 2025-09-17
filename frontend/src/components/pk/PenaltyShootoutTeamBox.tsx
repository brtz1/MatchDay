// frontend/src/components/pk/PenaltyShootoutTeamBox.tsx

import * as React from "react";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type Position = "GK" | "DF" | "MF" | "AT";
export type PkOutcome = "GOAL" | "MISS" | "SAVE";

export interface PlayerLite {
  id: number;
  name: string;
  position: Position;
  rating: number; // 1..99 in MatchDay!
  /** Optional: only consider players currently on the pitch */
  onPitch?: boolean;
}

export interface Shooter {
  id: number;
  name: string;
  position?: Position;
  rating?: number;
}

export interface PenaltyShootoutTeamBoxProps {
  /** Team display name */
  teamName: string;

  /**
   * If provided, this ordered list is rendered as-is.
   * If omitted, `players` will be used to auto-generate order AT→MF→DF by rating.
   */
  shooters?: Shooter[];

  /**
   * Full list of players to *derive* the shooters order from (AT→MF→DF by rating).
   * GK are excluded by default from the auto-order.
   */
  players?: PlayerLite[];

  /** How many base shooters to emphasize (default 5). */
  baseCount?: number;

  /** Right-align the list (useful for the away team column). */
  align?: "left" | "right";

  /**
   * Optional information to decorate list items:
   * - current: highlight the next shooter by shotIndex
   * - outcomesByIndex: render ✓/✖/🧤 on already-taken shots
   */
  current?: { shotIndex: number } | null;
  outcomesByIndex?: Record<number, PkOutcome | undefined>;
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/** Auto-pick shooters from players: priority AT → MF → DF, then rating DESC, tiebreak by name */
function autoPickShooters(players: PlayerLite[], max = 10): Shooter[] {
  const priority: Record<Position, number> = { AT: 0, MF: 1, DF: 2, GK: 3 };

  // filter out GK by default for shootouts (project rule)
  const pool = players.filter((p) => p.position !== "GK" && (p.onPitch ?? true));

  // sort by role priority, then rating desc, then name asc
  pool.sort((a, b) => {
    const prio = priority[a.position] - priority[b.position];
    if (prio !== 0) return prio;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  return pool.slice(0, Math.max(5, Math.min(max, pool.length))).map((p) => ({
    id: p.id,
    name: p.name,
    position: p.position,
    rating: p.rating,
  }));
}

function AttemptIcon({ outcome }: { outcome: PkOutcome }) {
  if (outcome === "GOAL") return <span className="text-base font-extrabold">✓</span>;
  if (outcome === "SAVE") return <span title="GK Save">🧤</span>;
  return <span className="text-base font-extrabold">✖</span>;
}

/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */

export default function PenaltyShootoutTeamBox(props: PenaltyShootoutTeamBoxProps) {
  const {
    teamName,
    shooters,
    players,
    baseCount = 5,
    align = "left",
    current,
    outcomesByIndex,
  } = props;

  // Decide list to render
  const list: Shooter[] = React.useMemo(() => {
    if (shooters && shooters.length) return shooters;
    if (players && players.length) return autoPickShooters(players, 15);
    return [];
  }, [shooters, players]);

  return (
    <div
      className={cx(
        "flex flex-col",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      {/* Team badge */}
      <div
        className={cx(
          "mb-2 inline-block rounded-md bg-red-600 px-3 py-1 text-xs font-black tracking-wide text-white",
          align === "right" ? "self-end" : "self-start",
        )}
      >
        {teamName.toUpperCase()}
      </div>

      {/* Shooter list */}
      <div className="w-full max-w-xs rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-2">
        {list.length === 0 ? (
          <div className="px-2 py-3 text-sm opacity-70">No shooters available</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {list.map((s, idx) => {
              const isCurrent = current?.shotIndex === idx;
              const outcome = outcomesByIndex?.[idx];
              const inBase = idx < baseCount;

              return (
                <li
                  key={s.id ?? `${s.name}-${idx}`}
                  className={cx(
                    "flex items-center justify-between gap-2 rounded-lg px-2 py-1",
                    "hover:bg-emerald-900/30",
                    inBase ? "bg-emerald-900/20" : "",
                    isCurrent ? "ring-2 ring-yellow-400/70" : "",
                  )}
                >
                  {/* Left chunk: position + name */}
                  <div
                    className={cx(
                      "flex min-w-0 items-center gap-2",
                      align === "right" && "flex-row-reverse",
                    )}
                  >
                    {s.position && (
                      <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-emerald-800 px-1 text-[10px] font-bold text-emerald-100">
                        {s.position}
                      </span>
                    )}

                    <span className="truncate text-sm text-emerald-100">
                      {s.name}
                    </span>

                    {isCurrent && (
                      <span
                        className={cx(
                          "text-xs font-bold text-yellow-300",
                          align === "right" ? "mr-1" : "ml-1",
                        )}
                        title="Current taker"
                      >
                        ★
                      </span>
                    )}
                  </div>

                  {/* Right chunk: rating / outcome */}
                  <div
                    className={cx(
                      "flex shrink-0 items-center gap-2",
                      align === "right" && "flex-row-reverse",
                    )}
                  >
                    {typeof s.rating === "number" && (
                      <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-bold text-emerald-100">
                        {s.rating}
                      </span>
                    )}

                    {outcome ? (
                      <span className="w-5 text-right">
                        <AttemptIcon outcome={outcome} />
                      </span>
                    ) : (
                      <span className="w-5 opacity-25">•</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-emerald-200/70">
        <span className="rounded bg-emerald-900/30 px-1.5 py-0.5">Top {baseCount}</span>
        <span>★ Current</span>
        <span>✓ Goal</span>
        <span>✖ Miss</span>
        <span>🧤 Save</span>
      </div>
    </div>
  );
}
