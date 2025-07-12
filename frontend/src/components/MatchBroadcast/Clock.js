import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from "clsx";
import { ProgressBar } from "@/components/common/ProgressBar";
/**
 * Formats the display string:
 *  – 45   => 45′
 *  – 90   => 90′
 *  – 92   => 90′ +2
 *  – 105  => 105′
 */
function formatMinute(value, total) {
    if (value <= total)
        return `${value}′`;
    const added = value - total;
    return `${total}′ +${added}`;
}
/**
 * **Clock** – Scoreboard-style minute indicator with optional progress bar.
 *
 * Typically controlled by broadcast tick events; simply re-render with the
 * updated `minute` prop each second.
 */
export function Clock({ minute, totalMinutes = 90, showProgress = true, className, ...rest }) {
    const clamped = Math.max(0, Math.round(minute));
    const percent = Math.min(100, (clamped / totalMinutes) * 100);
    const label = formatMinute(clamped, totalMinutes);
    return (_jsxs("div", { className: clsx("flex w-24 flex-col items-center gap-1 text-gray-900 dark:text-gray-100", className), ...rest, children: [_jsx("span", { className: "font-mono text-lg font-semibold tracking-tight", children: label }), showProgress && (_jsx(ProgressBar, { value: percent, variant: "primary", height: 0.25, className: "w-full" }))] }));
}
export default Clock;
//# sourceMappingURL=Clock.js.map