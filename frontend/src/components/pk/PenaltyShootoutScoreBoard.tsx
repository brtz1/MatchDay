// frontend/src/components/pk/PenaltyShootoutScoreboard.tsx

import * as React from "react";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type PkOutcome = "GOAL" | "MISS" | "SAVE";

export type Shooter = {
  id: number;
  name: string;
};

export type PkAttempt = {
  /** true = home side, false = away side */
  isHome: boolean;
  /** 0-based index of the shot within that team's order */
  shotIndex: number;
  outcome: PkOutcome;
  shooterId?: number;
  shooterName?: string;
  /** mark the attempt that mathematically decided the shootout */
  decisive?: boolean;
};

export interface PenaltyShootoutScoreboardProps {
  /** e.g., "São Paulo" */
  homeLabel: string;
  /** e.g., "Santos" */
  awayLabel: string;

  /** Pre-ordered takers (index 0..n). Usually 5, can be longer for sudden death. */
  homeShooters: Shooter[];
  awayShooters: Shooter[];

  /** All attempts so far (interleaved externally by the engine). */
  attempts: PkAttempt[];

  /**
   * Optional pointer to the *next* shooter to kick, for UI highlight.
   * If omitted, cells will not highlight the "current" shooter.
   */
  current?: { isHome: boolean; shotIndex: number } | null;

  /** When true, hides "current" highlights (the shootout has finished). */
  decided?: boolean;

  /** Optional container className */
  className?: string;
}

/* ------------------------------------------------------------------------- */
/* Utils                                                                     */
/* ------------------------------------------------------------------------- */

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function AttemptIcon({ outcome }: { outcome: PkOutcome }) {
  if (outcome === "GOAL") return <span className="text-2xl font-extrabold">✓</span>;
  if (outcome === "SAVE") return <span className="text-2xl" title="GK Save">🧤</span>;
  return <span className="text-2xl font-extrabold">✖</span>;
}

function AttemptCell(props: {
  label?: string;
  outcome?: PkOutcome;
  highlight?: boolean;
  decisive?: boolean;
  rightAlign?: boolean;
}) {
  const { label, outcome, highlight, decisive, rightAlign } = props;
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
        "border-emerald-900/40 bg-emerald-950/30",
        highlight && "ring-2 ring-yellow-400/70",
        decisive && "border-yellow-400/80",
        rightAlign && "flex-row-reverse",
      )}
    >
      <div
        className={cx(
          "truncate text-sm opacity-80",
          decisive && "font-bold text-emerald-100",
        )}
      >
        {label ?? "—"}
      </div>
      <div className={cx("w-6", rightAlign ? "text-left" : "text-right")}>
        {outcome ? <AttemptIcon outcome={outcome} /> : <span className="opacity-30">•</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */

export default function PenaltyShootoutScoreboard(props: PenaltyShootoutScoreboardProps) {
  const {
    homeLabel,
    awayLabel,
    homeShooters,
    awayShooters,
    attempts,
    current,
    decided,
    className,
  } = props;

  // Fast lookup: attempt by (side,index)
  const hMap = React.useMemo(() => {
    const m = new Map<number, PkAttempt>();
    for (const a of attempts) if (a.isHome) m.set(a.shotIndex, a);
    return m;
  }, [attempts]);
  const aMap = React.useMemo(() => {
    const m = new Map<number, PkAttempt>();
    for (const a of attempts) if (!a.isHome) m.set(a.shotIndex, a);
    return m;
  }, [attempts]);

  // Determine how many rows to render:
  // - at least 5 (best-of-5)
  // - plus any extra indexes we have attempts for
  // - also not less than the length of shooter lists (in case >5 were sent)
  const rowsCount = React.useMemo(() => {
    const hMax = hMap.size ? Math.max(...[...hMap.keys()]) + 1 : 0;
    const aMax = aMap.size ? Math.max(...[...aMap.keys()]) + 1 : 0;
    return Math.max(5, hMax, aMax, homeShooters.length, awayShooters.length);
  }, [hMap, aMap, homeShooters.length, awayShooters.length]);

  // Build rows with labels & outcomes
  const rows = React.useMemo(() => {
    const list: {
      index: number;
      h: { label?: string; outcome?: PkOutcome; decisive?: boolean; highlight?: boolean };
      a: { label?: string; outcome?: PkOutcome; decisive?: boolean; highlight?: boolean };
    }[] = [];
    for (let i = 0; i < rowsCount; i++) {
      const hAtt = hMap.get(i);
      const aAtt = aMap.get(i);
      const hLabel = homeShooters[i]?.name ?? hAtt?.shooterName ?? "";
      const aLabel = awayShooters[i]?.name ?? aAtt?.shooterName ?? "";

      list.push({
        index: i,
        h: {
          label: hLabel,
          outcome: hAtt?.outcome,
          decisive: !!hAtt?.decisive,
          highlight: !decided && current?.isHome === true && current?.shotIndex === i && !hAtt,
        },
        a: {
          label: aLabel,
          outcome: aAtt?.outcome,
          decisive: !!aAtt?.decisive,
          highlight: !decided && current?.isHome === false && current?.shotIndex === i && !aAtt,
        },
      });
    }
    return list;
  }, [rowsCount, hMap, aMap, homeShooters, awayShooters, current, decided]);

  return (
    <div className={cx("grid grid-cols-2 gap-4 md:gap-6", className)}>
      {/* Left (Home) */}
      <div>
        <div className="mb-1 text-xs uppercase tracking-widest text-emerald-200/70">
          {homeLabel}
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <AttemptCell
              key={`h-${r.index}`}
              label={r.h.label}
              outcome={r.h.outcome}
              decisive={r.h.decisive}
              highlight={r.h.highlight}
            />
          ))}
        </div>
      </div>

      {/* Right (Away) */}
      <div>
        <div className="mb-1 text-right text-xs uppercase tracking-widest text-emerald-200/70">
          {awayLabel}
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <AttemptCell
              key={`a-${r.index}`}
              label={r.a.label}
              outcome={r.a.outcome}
              decisive={r.a.decisive}
              highlight={r.a.highlight}
              rightAlign
            />
          ))}
        </div>
      </div>
    </div>
  );
}
