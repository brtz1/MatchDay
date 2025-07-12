import * as React from "react";
import clsx from "clsx";
import { ProgressBar } from "@/components/common/ProgressBar";

export interface ClockProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Current simulated minute (e.g. 67, 91, 105). */
  minute: number;
  /** Regulation length – 90 for league / 120 for cup ties. */
  totalMinutes?: number;
  /** Render a small progress bar underneath the time. */
  showProgress?: boolean;
}

/**
 * Formats the display string:
 *  – 45   => 45′
 *  – 90   => 90′
 *  – 92   => 90′ +2
 *  – 105  => 105′
 */
function formatMinute(value: number, total: number) {
  if (value <= total) return `${value}′`;
  const added = value - total;
  return `${total}′ +${added}`;
}

/**
 * **Clock** – Scoreboard-style minute indicator with optional progress bar.
 *
 * Typically controlled by broadcast tick events; simply re-render with the
 * updated `minute` prop each second.
 */
export function Clock({
  minute,
  totalMinutes = 90,
  showProgress = true,
  className,
  ...rest
}: ClockProps) {
  const clamped = Math.max(0, Math.round(minute));
  const percent = Math.min(100, (clamped / totalMinutes) * 100);
  const label = formatMinute(clamped, totalMinutes);

  return (
    <div
      className={clsx(
        "flex w-24 flex-col items-center gap-1 text-gray-900 dark:text-gray-100",
        className
      )}
      {...rest}
    >
      <span className="font-mono text-lg font-semibold tracking-tight">
        {label}
      </span>

      {showProgress && (
        <ProgressBar
          value={percent}
          variant="primary"
          height={0.25}
          className="w-full"
        />
      )}
    </div>
  );
}

export default Clock;
