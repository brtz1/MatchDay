// frontend/src/components/pk/SuspenseTicker.tsx
//
// Tiny 1–2s suspense/countdown bar used between PK attempts or before revealing
// a single in-match penalty result. Tailwind-only, no external deps.
//
// Features:
// - Determinate mode (default): fills from 0 → 100% in `ms` and then calls `onDone`.
// - Indeterminate mode: looping shimmer (use when duration is unknown).
// - Optional label, sizes, and auto-hide when finished.

import * as React from "react";

export interface SuspenseTickerProps {
  /** Duration in ms for the countdown/fill. Default: 1200 */
  ms?: number;
  /** When true, shows an infinite shimmer instead of a timed fill. Default: false */
  indeterminate?: boolean;
  /** Called once when a determinate countdown finishes */
  onDone?: () => void;
  /** Hide the bar after it finishes (determinate only). Default: true */
  hideWhenDone?: boolean;
  /** Optional label shown above the bar (e.g., “Preparing…”) */
  label?: React.ReactNode;
  /** Visual size (height). Default: "md" */
  size?: "sm" | "md" | "lg";
  /** Extra className for the container */
  className?: string;
}

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function SuspenseTicker({
  ms = 1200,
  indeterminate = false,
  onDone,
  hideWhenDone = true,
  label,
  size = "md",
  className,
}: SuspenseTickerProps) {
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (indeterminate) return;
    setDone(false);
    const t = setTimeout(() => {
      setDone(true);
      onDone?.();
    }, Math.max(0, ms));
    return () => clearTimeout(t);
    // re-run if ms or indeterminate toggle changes
  }, [ms, indeterminate, onDone]);

  if (!indeterminate && hideWhenDone && done) return null;

  const h =
    size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div
      className={cx("w-full", className)}
      role="status"
      aria-busy={indeterminate || !done}
      aria-live="polite"
    >
      {label ? (
        <div className="mb-2 text-xs uppercase tracking-widest text-emerald-200/70">
          {label}
        </div>
      ) : null}

      <div className={cx("w-full overflow-hidden rounded bg-emerald-900/40", h)}>
        {/* Track background */}
        <div
          className={cx(
            "relative h-full",
            indeterminate
              ? "animate-[suspense-shimmer_1.2s_linear_infinite] bg-emerald-400/70"
              : "bg-emerald-400/80",
          )}
          style={
            indeterminate
              ? undefined
              : {
                  // Smooth width fill from 0 → 100% over `ms`
                  animationName: "suspense-fill",
                  animationDuration: `${Math.max(1, ms)}ms`,
                  animationTimingFunction: "linear",
                  animationFillMode: "forwards",
                }
          }
        />
      </div>

      {/* Local keyframes to keep this component self-contained */}
      <style>
        {`
@keyframes suspense-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%);  }
}
@keyframes suspense-fill {
  0%   { width: 0%; }
  100% { width: 100%; }
}
        `}
      </style>
    </div>
  );
}
