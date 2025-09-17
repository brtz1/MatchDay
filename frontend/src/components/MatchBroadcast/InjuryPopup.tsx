// frontend/src/components/MatchBroadcast/InjuryPopup.tsx
import * as React from "react";
import { useMemo, useState } from "react";

export type PlayerLite = {
  id: number;
  name: string;
  position: string;
  rating?: number;
};

export type PlayerDTO = {
  id: number;
  name: string;
  position: string;
  rating: number;
  isInjured: boolean;
};

interface InjuryPopupProps {
  open: boolean;
  /** REQUIRED: injured player is the OUT candidate */
  injured: PlayerLite;
  /** Current on-pitch (injured is still here until coach decides) */
  lineup: PlayerDTO[];
  /** Available reserves */
  bench: PlayerDTO[];
  subsRemaining: number;
  isHomeTeam: boolean;

  /** Confirm = OUT: injured.id, IN: picked reserve id */
  onConfirmSub: (payload: { out: number; in: number }) => Promise<void> | void;

  /** Resume with NO sub: remove injured from lineup, then resume */
  onResumeNoSub: (injuredId: number) => Promise<void> | void;

  title?: string;           // default: "Player Injured"
  confirmLabel?: string;    // default: "Confirm substitution"
  resumeLabel?: string;     // default: "Resume match"
}

export default function InjuryPopup({
  open,
  injured,
  lineup,
  bench,
  subsRemaining,
  isHomeTeam,
  onConfirmSub,
  onResumeNoSub,
  title = "Player Injured",
  confirmLabel = "Confirm substitution",
  resumeLabel = "Resume match",
}: InjuryPopupProps) {
  const [selectedReserveId, setSelectedReserveId] = useState<number | null>(null);

  const injuredIsGK = (injured.position ?? "").toUpperCase() === "GK";

  // Count GKs currently on the field (injured may still be on the field until action)
  const gkOnField = useMemo(
    () => lineup.filter((p) => (p.position ?? "").toUpperCase() === "GK").length,
    [lineup]
  );

  // Eligible bench:
  // - If injured is GK → only bench GKs
  // - If injured is NOT GK and a GK is already on field → disallow choosing GK
  // - Else → any bench player
  const selectableBench = useMemo(() => {
    const isGK = (pos: string) => (pos ?? "").toUpperCase() === "GK";
    if (injuredIsGK) return bench.filter((b) => isGK(b.position));
    if (gkOnField >= 1) return bench.filter((b) => !isGK(b.position));
    return bench;
  }, [bench, injuredIsGK, gkOnField]);

  const confirmDisabled =
    !open ||
    subsRemaining <= 0 ||
    selectedReserveId == null ||
    selectableBench.findIndex((p) => p.id === selectedReserveId) === -1;

  const handleConfirm = async () => {
    if (confirmDisabled || selectedReserveId == null) return;
    await onConfirmSub({ out: injured.id, in: selectedReserveId });
    setSelectedReserveId(null);
  };

  const handleResumeNoSub = async () => {
    await onResumeNoSub(injured.id);
    setSelectedReserveId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-5 text-gray-900 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">
            {isHomeTeam ? "Home" : "Away"}
          </span>
        </div>

        {/* Banner */}
        <div className="mb-5 rounded-lg bg-red-50 p-4">
          <div className="text-sm text-red-800">
            <span className="font-semibold">{injured.name}</span>{" "}
            <span className="opacity-80">
              ({injured.position}
              {typeof injured.rating === "number" ? ` · Rating ${injured.rating}` : ""})
            </span>{" "}
            got injured. Pick a reserve to be subbed in, or resume to play with 10.
          </div>
          <div className="mt-1 text-xs text-red-700">
            {injuredIsGK
              ? "If a goalkeeper is available on the bench, you must field one."
              : "Confirm is enabled only after you choose a reserve."}
          </div>
        </div>

        {/* Bench list */}
        <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Reserve</th>
                <th className="px-3 py-2 text-left font-semibold">Pos</th>
                <th className="px-3 py-2 text-right font-semibold">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {selectableBench.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                    No eligible reserves available.
                  </td>
                </tr>
              ) : (
                selectableBench.map((p) => {
                  const active = selectedReserveId === p.id;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedReserveId(p.id)}
                      className={`cursor-pointer ${active ? "bg-green-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2">{p.position}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.rating}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            Subs remaining: <span className="font-semibold">{subsRemaining}</span>
          </div>

          <div className="flex gap-2">
            {/* Play with 10 → remove injured on resume */}
            <button
              type="button"
              onClick={handleResumeNoSub}
              className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
              title="Remove injured and resume (play with 10)"
            >
              {resumeLabel}
            </button>

            {/* Confirm is only enabled after a reserve is chosen */}
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={handleConfirm}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                confirmDisabled
                  ? "bg-green-400/60 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
              title={
                subsRemaining <= 0
                  ? "No substitutions remaining"
                  : selectedReserveId == null
                  ? "Select a reserve to confirm"
                  : ""
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
