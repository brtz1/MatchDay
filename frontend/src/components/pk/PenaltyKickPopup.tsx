// frontend/src/components/pk/PenaltyKickPopup.tsx
//
// In-match penalty popup for the coached team.
// - Lists current *lineup* players for selection (default excludes GK).
// - Immediately shows the outcome once backend resolves: "GOAL!", "MISSED!", or "GK DEFENDS!".
// - Calls POST /pk/take with { saveGameId, matchId, shooterId }.
// - Emits result via onResolved and then lets the parent close.
//
// Tailwind-only, no external UI deps.

import * as React from "react";
import api from "@/services/axios";
import SuspenseTicker from "./SuspenseTicker";

/* ------------------------------------------------------------------------- */
/* Types                                                                     */
/* ------------------------------------------------------------------------- */

export type Position = "GK" | "DF" | "MF" | "AT";
export type PkOutcome = "GOAL" | "MISS" | "SAVE";

export type PlayerLite = {
  id: number;
  name: string;
  position: Position;
  rating: number; // 1..99
};

type Stage = "choose" | "suspense" | "reveal";

export interface PenaltyKickPopupProps {
  /** Controls visibility */
  open: boolean;

  /** SaveGame + Match used by the backend call */
  saveGameId: number;
  matchId: number;

  /** Current lineup (on the pitch). We will sort AT→MF→DF (GK excluded by default). */
  lineup: PlayerLite[];

  /** Optional team label in header (e.g., "Fluminense") */
  teamName?: string;

  /** Minute of the match when the penalty was awarded */
  minute?: number | null;

  /** If true, GK appears in the list (default false) */
  allowGK?: boolean;

  /** Called when the whole flow is finished (after reveal, on Continue) */
  onClose: () => void;

  /** Called after backend resolves outcome (before user closes) */
  onResolved?: (res: {
    shooterId: number;
    outcome: PkOutcome;
    newScore?: { home: number; away: number };
  }) => void;
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------- */

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const POS_PRIORITY: Record<Position, number> = { AT: 0, MF: 1, DF: 2, GK: 3 };
const SUSPENSE_MS = 1800;
const SUSPENSE_EXTRA_HOLD_MS = 600;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, Math.max(0, ms));
  });
}

/** Sort AT→MF→DF→GK and then rating DESC, tiebreak by name */
function sortForPenalty(list: PlayerLite[], allowGK = false) {
  const filtered = allowGK ? list.slice() : list.filter((p) => p.position !== "GK");
  filtered.sort((a, b) => {
    const pr = POS_PRIORITY[a.position] - POS_PRIORITY[b.position];
    if (pr !== 0) return pr;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });
  return filtered;
}

function OutcomeBig({ outcome }: { outcome: PkOutcome }) {
  const text =
    outcome === "GOAL" ? "GOAL!" : outcome === "SAVE" ? "GK DEFENDS!" : "MISSED!";
  const color =
    outcome === "GOAL"
      ? "text-lime-300"
      : outcome === "SAVE"
      ? "text-cyan-300"
      : "text-red-300";
  return (
    <div className={cx("select-none text-5xl font-black tracking-wide", color)}>
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */

export default function PenaltyKickPopup(props: PenaltyKickPopupProps) {
  const {
    open,
    saveGameId,
    matchId,
    lineup,
    teamName,
    minute,
    allowGK = false,
    onClose,
    onResolved,
  } = props;

  const [stage, setStage] = React.useState<Stage>("choose");
  const [sorted, setSorted] = React.useState<PlayerLite[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [outcome, setOutcome] = React.useState<PkOutcome | null>(null);
  const [newScore, setNewScore] = React.useState<{ home: number; away: number } | undefined>();
  const suspenseTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const startSuspenseDelay = React.useCallback(() => {
    if (suspenseTimeoutRef.current) {
      clearTimeout(suspenseTimeoutRef.current);
    }
    return new Promise<void>((resolve) => {
      suspenseTimeoutRef.current = setTimeout(() => {
        suspenseTimeoutRef.current = null;
        resolve();
      }, SUSPENSE_MS);
    });
  }, []);

  // Prepare visible list when opened
  React.useEffect(() => {
    if (open) {
      setStage("choose");
      setSelectedId(null);
      setOutcome(null);
      setNewScore(undefined);
      setError(null);
      setLoading(false);
    } else {
      setSelectedId(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    setSorted(sortForPenalty(lineup, allowGK));
  }, [open, lineup, allowGK]);

  React.useEffect(() => {
    return () => {
      if (suspenseTimeoutRef.current) {
        clearTimeout(suspenseTimeoutRef.current);
      }
    };
  }, []);

  const shooter = React.useMemo(
    () => sorted.find((p) => p.id === selectedId),
    [sorted, selectedId],
  );

  async function handlePick(playerId: number) {
    if (loading) return;
    setSelectedId(playerId);
    setStage("suspense");
    setError(null);
    setOutcome(null);
    setNewScore(undefined);
    setLoading(true);
    const suspenseDone = startSuspenseDelay();

    let respOutcome: PkOutcome = "MISS";
    let respScore: { home: number; away: number } | undefined;
    let errorMessage: string | null = null;

    try {
      const payload: {
        saveGameId: number;
        matchId: number;
        shooterId: number;
        minute?: number;
      } = {
        saveGameId,
        matchId,
        shooterId: playerId,
      };
      if (typeof minute === "number") {
        payload.minute = minute;
      }

      const { data } = await api.post("/pk/take", payload);
      // Expected { outcome: 'GOAL'|'MISS'|'SAVE', newScore?: {home,away} }
      respOutcome = (data?.outcome ?? "MISS") as PkOutcome;
      if (data?.newScore && typeof data.newScore.home === "number") {
        respScore = data.newScore;
      }
    } catch (e) {
      // If backend fails, default to MISS so game can continue (fail-safe).
      errorMessage = "Network error. Treating as miss.";
      respOutcome = "MISS";
    }

    await suspenseDone;
    await wait(SUSPENSE_EXTRA_HOLD_MS);

    setOutcome(respOutcome);
    setNewScore(respScore);
    setStage("reveal");
    setLoading(false);
    setError(errorMessage);

    onResolved?.({
      shooterId: playerId,
      outcome: respOutcome,
      newScore: respScore,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

      {/* Dialog */}
      <div
        className={cx(
          "relative z-10 w-[min(720px,92vw)] rounded-2xl border-2 border-emerald-900/40",
          "bg-red-900/90 shadow-2xl ring-1 ring-black/30",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-red-950/70 px-5 py-3">
          <div className="select-none text-3xl font-black tracking-[0.3em] text-lime-200">
            PENALTI
          </div>
          <div className="rounded bg-red-800/60 px-2 py-1 text-xs font-bold text-red-100">
            {teamName ?? "Your Team"}
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-4">
          {stage === "choose" && (
            <>
              <p className="mb-3 text-sm text-red-50/90">
                Choose the player to take the penalty:
              </p>

              <div className="max-h-[50vh] overflow-auto rounded-xl border border-red-800/60 bg-red-950/40">
                <ul className="divide-y divide-red-800/40">
                  {sorted.map((p) => (
                    <li
                      key={p.id}
                      className={cx(
                        "flex cursor-pointer items-center justify-between px-3 py-2.5 transition",
                        "hover:bg-red-900/40",
                        selectedId === p.id && "bg-red-900/50 ring-1 ring-yellow-300/60",
                      )}
                      onClick={() => handlePick(p.id)}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-red-800 px-1 text-[10px] font-bold text-red-100">
                          {p.position}
                        </span>
                        <span className="truncate text-sm text-red-50">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-red-800 px-1.5 py-0.5 text-[10px] font-bold text-red-100">
                          {p.rating}
                        </span>
                        <button
                          className={cx(
                            "rounded-lg px-3 py-1.5 text-xs font-bold text-red-950 shadow-sm transition",
                            loading
                              ? "cursor-not-allowed bg-yellow-500/60 text-red-900/60"
                              : "bg-yellow-400 hover:brightness-95 active:translate-y-[1px]",
                          )}
                          disabled={loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePick(p.id);
                          }}
                        >
                          Choose
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {loading && (
                <div className="mt-3 text-xs font-semibold text-red-100/80">
                  Resolving penalty...
                </div>
              )}

              {error && (
                <div className="mt-3 text-xs font-semibold text-yellow-200">{error}</div>
              )}
            </>
          )}

          {stage === "suspense" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs uppercase tracking-[0.4em] text-red-100/60">
                Taking the penalty
              </p>
              <div className="mt-3 text-2xl font-black text-yellow-200">
                {shooter ? shooter.name : "Your taker"} steps up...
              </div>
              <div className="mt-6 w-full max-w-md">
                <SuspenseTicker
                  ms={SUSPENSE_MS}
                  label="Hold your breath"
                  size="lg"
                  hideWhenDone={false}
                />
              </div>
              <p className="mt-6 text-xs text-red-100/70">
                Will it be a goal, a miss, or a save?
              </p>
            </div>
          )}

          {stage === "reveal" && outcome && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <OutcomeBig outcome={outcome} />
              {typeof minute === "number" && (
                <div className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-100/70">
                  {minute}' penalty
                </div>
              )}
              {newScore && (
                <div className="mt-3 rounded bg-red-800/60 px-3 py-1 text-xs font-bold text-red-100">
                  Score now: {newScore.home}:{newScore.away}
                </div>
              )}
              {error && (
                <div className="mt-3 text-xs font-semibold text-yellow-200">{error}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 rounded-b-2xl bg-red-950/70 px-5 py-3">
          {stage === "choose" ? (
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-100/80 hover:text-red-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          ) : stage === "suspense" ? (
            <button
              className="cursor-not-allowed rounded-lg bg-red-800/60 px-3 py-1.5 text-xs font-bold text-red-200/60"
              disabled
            >
              Taking penalty...
            </button>
          ) : (
            <button
              className="rounded-lg bg-yellow-400 px-4 py-1.5 text-xs font-bold text-red-950 shadow-sm transition hover:brightness-95 active:translate-y-[1px]"
              onClick={onClose}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
