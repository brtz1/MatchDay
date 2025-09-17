import * as React from "react";
import { useMemo, useState } from "react";

/** Keep this shape aligned with what MatchDayLive passes in */
export type PlayerDTO = {
  id: number;
  name: string;
  position: string;
  rating: number;
  isInjured: boolean;
};

interface GKRedPopupProps {
  open: boolean;

  /** Current on-pitch players for the affected side.
   *  NOTE: Backend has already removed the sent-off GK.
   */
  lineup: PlayerDTO[];

  /** Bench players for the affected side (all positions). */
  bench: PlayerDTO[];

  /** Server-authoritative substitutions remaining. */
  subsRemaining: number;

  /** Which side is affected (for a small badge only). */
  isHomeTeam: boolean;

  /** Called with { out: fieldPlayerId, in: benchPlayerId } */
  onConfirmSub: (payload: { out: number; in: number }) => Promise<void> | void;

  /** Resume match without making a sub (play without GK if needed) */
  onResume: () => Promise<void> | void;

  // Optional labels
  title?: string; // default: "Goalkeeper Sent Off"
  confirmLabel?: string; // default: "Confirm substitution"
  resumeLabel?: string; // default: "Resume match"
}

const isGK = (pos?: string) =>
  (pos ?? "").toUpperCase() === "GK" || (pos ?? "").toUpperCase() === "GOALKEEPER";

export default function GKRedPopup({
  open,
  lineup,
  bench,
  subsRemaining,
  isHomeTeam,
  onConfirmSub,
  onResume,
  title = "Goalkeeper Sent Off",
  confirmLabel = "Confirm substitution",
  resumeLabel = "Resume match",
}: GKRedPopupProps) {
  // Select one field player (out) and one bench player (in; GK optional)
  const [selectedOutId, setSelectedOutId] = useState<number | null>(null);
  const [selectedInId, setSelectedInId] = useState<number | null>(null);

  // Count any GKs still on the field (should be 0 after the red, but be defensive)
  const gkOnField = useMemo(() => lineup.filter((p) => isGK(p.position)).length, [lineup]);

  // Eligible OUT candidates: on-pitch **non-GK** players
  const outCandidates = useMemo(
    () => lineup.filter((p) => !isGK(p.position)),
    [lineup]
  );

  // Eligible IN candidates: **all** bench players; but prevent selecting a GK if a GK is already on
  const benchCandidates = useMemo(() => {
    if (gkOnField >= 1) {
      return bench.filter((p) => !isGK(p.position));
    }
    return bench;
  }, [bench, gkOnField]);

  const noBenchChoices = benchCandidates.length === 0;
  const noOutChoices = outCandidates.length === 0;

  const selectedInIsGK =
    selectedInId != null && isGK(bench.find((b) => b.id === selectedInId)?.position);

  const confirmDisabled =
    !open ||
    subsRemaining <= 0 ||
    noBenchChoices ||
    noOutChoices ||
    selectedOutId == null ||
    selectedInId == null ||
    (gkOnField >= 1 && selectedInIsGK); // can't add a GK if one is already on

  const handleConfirm = async () => {
    if (selectedOutId == null || selectedInId == null) return;
    await onConfirmSub({ out: selectedOutId, in: selectedInId });
    setSelectedOutId(null);
    setSelectedInId(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-5 text-gray-900 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold">
            {isHomeTeam ? "Home" : "Away"}
          </span>
        </div>

        {/* Explanation */}
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">Your goalkeeper was sent off.</p>
          <p className="mt-1">
            You may resume play immediately, or make a substitution now. You can:
          </p>
          <ul className="mt-2 list-disc pl-5 text-xs text-red-700">
            <li>
              remove <strong>any field player</strong> and bring on{" "}
              <strong>any bench player</strong> (GK or not);
            </li>
            <li>only one goalkeeper is allowed on the field at a time;</li>
            <li>a substitution will be consumed if you confirm a change.</li>
          </ul>
        </div>

        {/* Panels */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* OUT: On-pitch field players */}
          <div className="rounded-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-sm font-semibold">Select field player to remove</span>
              <span className="text-xs text-gray-500">{outCandidates.length} available</span>
            </div>

            <div className="max-h-72 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold">Player</th>
                    <th className="px-3 py-2 text-left font-semibold">Pos</th>
                    <th className="px-3 py-2 text-right font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {outCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                        No field players available to remove.
                      </td>
                    </tr>
                  ) : (
                    outCandidates.map((p) => {
                      const active = selectedOutId === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedOutId(p.id)}
                          className={`cursor-pointer ${active ? "bg-yellow-50" : "hover:bg-gray-50"}`}
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
          </div>

          {/* IN: Bench players (any position) */}
          <div className="rounded-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
              <span className="text-sm font-semibold">Select reserve to bring on</span>
              <span className="text-xs text-gray-500">{benchCandidates.length} available</span>
            </div>

            <div className="max-h-72 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold">Player</th>
                    <th className="px-3 py-2 text-left font-semibold">Pos</th>
                    <th className="px-3 py-2 text-right font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {benchCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                        No eligible reserves available.
                      </td>
                    </tr>
                  ) : (
                    benchCandidates.map((p) => {
                      const active = selectedInId === p.id;
                      const gkBadge =
                        isGK(p.position) && gkOnField === 0 ? (
                          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                            GK recommended
                          </span>
                        ) : null;

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedInId(p.id)}
                          className={`cursor-pointer ${active ? "bg-green-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-3 py-2">
                            {p.name}
                            {gkBadge}
                          </td>
                          <td className="px-3 py-2">{p.position}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{p.rating}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            Subs remaining: <span className="font-semibold">{subsRemaining}</span>
            {gkOnField >= 1 && (
              <span className="ml-2 text-red-600">
                · A goalkeeper is already on the field — you can’t add another.
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onResume}
              className="rounded-xl bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
              title="Resume without making a substitution"
            >
              {resumeLabel}
            </button>

            <button
              type="button"
              disabled={confirmDisabled}
              onClick={handleConfirm}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                confirmDisabled ? "bg-green-400/60 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
              title={
                subsRemaining <= 0
                  ? "No substitutions remaining"
                  : noBenchChoices
                  ? "No eligible reserves available"
                  : noOutChoices
                  ? "No field player available to remove"
                  : gkOnField >= 1 && selectedInIsGK
                  ? "There is already a goalkeeper on the field"
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
