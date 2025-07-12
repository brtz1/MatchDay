import * as React from "react";
import { forwardRef, type HTMLAttributes } from "react";
import clsx from "clsx";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * Current progress (0 – 100).  
   * If `undefined`, the bar shows an indeterminate “stripe” animation.
   */
  value?: number;
  /** Visually change the colour palette. */
  variant?: "primary" | "success" | "danger" | "warning";
  /** Height in `rem`. Defaults to `0.5rem` (h-2). */
  height?: number;
  /** Show numeric value as centred label (e.g. “42%”). */
  showLabel?: boolean;
}

/**
 * ---------------------------------------------------------------------------
 * Tailwind class maps
 * ---------------------------------------------------------------------------
 */

const trackClass =
  "relative overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700";

const variantClass: Record<NonNullable<ProgressBarProps["variant"]>, string> = {
  primary: "bg-blue-600 dark:bg-blue-500",
  success: "bg-green-600 dark:bg-green-500",
  danger: "bg-red-600 dark:bg-red-500",
  warning: "bg-yellow-500 dark:bg-yellow-400",
};

const indeterminateAnim =
  "after:content-[''] after:absolute after:inset-0 after:-translate-x-full after:animate-progress-stripes after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent";

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      variant = "primary",
      height = 0.5,
      showLabel = false,
      className,
      ...rest
    },
    ref
  ) => {
    const percent = Math.max(0, Math.min(100, value ?? 0));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
        className={clsx(trackClass, className)}
        style={{ height: `${height}rem` }}
        {...rest}
      >
        {/* Fill */}
        <div
          className={clsx(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            variantClass[variant],
            value === undefined && indeterminateAnim
          )}
          style={{ width: value !== undefined ? `${percent}%` : "100%" }}
        />

        {/* Optional label */}
        {showLabel && value !== undefined && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
            {percent}%
          </span>
        )}
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

/**
 * ---------------------------------------------------------------------------
 * Extra Tailwind keyframes (add once globally)
 * ---------------------------------------------------------------------------
 *
 * In your `tailwind.config.ts`:
 *
 * theme: {
 *   extend: {
 *     keyframes: {
 *       "progress-stripes": {
 *         "0%": { transform: "translateX(-100%)" },
 *         "100%": { transform: "translateX(100%)" },
 *       },
 *     },
 *     animation: {
 *       "progress-stripes": "progress-stripes 1.5s linear infinite",
 *     },
 *   },
 * },
 */

export default ProgressBar;
