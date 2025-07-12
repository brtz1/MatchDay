import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import clsx from "clsx";
/**
 * ---------------------------------------------------------------------------
 * Tailwind class maps
 * ---------------------------------------------------------------------------
 */
const trackClass = "relative overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700";
const variantClass = {
    primary: "bg-blue-600 dark:bg-blue-500",
    success: "bg-green-600 dark:bg-green-500",
    danger: "bg-red-600 dark:bg-red-500",
    warning: "bg-yellow-500 dark:bg-yellow-400",
};
const indeterminateAnim = "after:content-[''] after:absolute after:inset-0 after:-translate-x-full after:animate-progress-stripes after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent";
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export const ProgressBar = forwardRef(({ value, variant = "primary", height = 0.5, showLabel = false, className, ...rest }, ref) => {
    const percent = Math.max(0, Math.min(100, value ?? 0));
    return (_jsxs("div", { ref: ref, role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": value ?? undefined, className: clsx(trackClass, className), style: { height: `${height}rem` }, ...rest, children: [_jsx("div", { className: clsx("h-full rounded-full transition-[width] duration-300 ease-out", variantClass[variant], value === undefined && indeterminateAnim), style: { width: value !== undefined ? `${percent}%` : "100%" } }), showLabel && value !== undefined && (_jsxs("span", { className: "absolute inset-0 flex items-center justify-center text-xs font-medium text-white", children: [percent, "%"] }))] }));
});
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
//# sourceMappingURL=ProgressBar.js.map