import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useEffect, useRef, } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Square, HeartCrack, Repeat, } from "lucide-react";
/**
 * ---------------------------------------------------------------------------
 * Icon + colour maps
 * ---------------------------------------------------------------------------
 */
const iconMap = {
    GOAL: Star,
    YELLOW: Square,
    RED: Square,
    INJURY: HeartCrack,
    SUB: Repeat,
    INFO: Star,
};
const colourMap = {
    GOAL: "text-blue-600 dark:text-blue-400",
    YELLOW: "text-yellow-500",
    RED: "text-red-600",
    INJURY: "text-pink-600",
    SUB: "text-emerald-600",
    INFO: "text-gray-500",
};
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export const MatchEventFeed = forwardRef(({ events, reverse = true, maxHeightRem = 20, className, ...rest }, ref) => {
    const scrollRef = useRef(null);
    /** Auto-scroll to top (reverse) or bottom (normal) on update. */
    useEffect(() => {
        if (!scrollRef.current)
            return;
        requestAnimationFrame(() => {
            if (reverse) {
                scrollRef.current.scrollTop = 0;
            }
            else {
                scrollRef.current.scrollTop =
                    scrollRef.current.scrollHeight;
            }
        });
    }, [events.length, reverse]);
    const ordered = reverse
        ? [...events].slice().reverse()
        : events;
    return (_jsx("div", { ref: ref, className: clsx("relative w-full", className), ...rest, children: _jsx("div", { ref: scrollRef, className: "space-y-2 overflow-y-auto pr-2", style: { maxHeight: `${maxHeightRem}rem` }, children: _jsx(AnimatePresence, { initial: false, children: ordered.map((ev) => {
                    const Icon = iconMap[ev.type ?? "INFO"] ?? Star;
                    const colour = colourMap[ev.type ?? "INFO"] ??
                        "text-gray-500";
                    return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.18 }, className: "flex items-start gap-2", children: [_jsxs("span", { className: "w-9 shrink-0 text-right font-mono text-sm text-gray-600 dark:text-gray-400", children: [ev.minute, "\u2032"] }), _jsx(Icon, { className: clsx("h-4 w-4 shrink-0 mt-0.5", colour) }), _jsx("p", { className: "flex-1 text-sm text-gray-900 dark:text-gray-100", children: ev.text })] }, ev.id));
                }) }) }) }));
});
MatchEventFeed.displayName = "MatchEventFeed";
export default MatchEventFeed;
//# sourceMappingURL=MatchEventFeed.js.map