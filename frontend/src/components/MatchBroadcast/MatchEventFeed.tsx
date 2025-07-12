import * as React from "react";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  Star,
  Square,
  HeartCrack,
  Repeat,
  LucideIcon,
} from "lucide-react";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export type MatchEventType =
  | "GOAL"
  | "YELLOW"
  | "RED"
  | "INJURY"
  | "SUB"
  | "INFO";

export interface MatchEvent {
  id: string | number;
  minute: number;
  /** A short description – “Messi ⚽️” */
  text: ReactNode;
  /** Drives icon & colour. */
  type?: MatchEventType;
}

export interface MatchEventFeedProps
  extends HTMLAttributes<HTMLDivElement> {
  events: MatchEvent[];
  /** Latest events on top (default: true). */
  reverse?: boolean;
  /** Fixed max-height; scrolls internally. */
  maxHeightRem?: number;
}

/**
 * ---------------------------------------------------------------------------
 * Icon + colour maps
 * ---------------------------------------------------------------------------
 */

const iconMap: Record<MatchEventType, LucideIcon> = {
  GOAL: Star,
  YELLOW: Square,
  RED: Square,
  INJURY: HeartCrack,
  SUB: Repeat,
  INFO: Star,
};

const colourMap: Record<MatchEventType, string> = {
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

export const MatchEventFeed = forwardRef<
  HTMLDivElement,
  MatchEventFeedProps
>(
  (
    {
      events,
      reverse = true,
      maxHeightRem = 20,
      className,
      ...rest
    },
    ref
  ) => {
    const scrollRef = useRef<HTMLDivElement | null>(null);

    /** Auto-scroll to top (reverse) or bottom (normal) on update. */
    useEffect(() => {
      if (!scrollRef.current) return;
      requestAnimationFrame(() => {
        if (reverse) {
          scrollRef.current!.scrollTop = 0;
        } else {
          scrollRef.current!.scrollTop =
            scrollRef.current!.scrollHeight;
        }
      });
    }, [events.length, reverse]);

    const ordered = reverse
      ? [...events].slice().reverse()
      : events;

    return (
      <div
        ref={ref}
        className={clsx(
          "relative w-full",
          className
        )}
        {...rest}
      >
        <div
          ref={scrollRef}
          className="space-y-2 overflow-y-auto pr-2"
          style={{ maxHeight: `${maxHeightRem}rem` }}
        >
          <AnimatePresence initial={false}>
            {ordered.map((ev) => {
              const Icon =
                iconMap[ev.type ?? "INFO"] ?? Star;
              const colour =
                colourMap[ev.type ?? "INFO"] ??
                "text-gray-500";

              return (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-start gap-2"
                >
                  <span className="w-9 shrink-0 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                    {ev.minute}&prime;
                  </span>

                  <Icon
                    className={clsx(
                      "h-4 w-4 shrink-0 mt-0.5",
                      colour
                    )}
                  />

                  <p className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                    {ev.text}
                  </p>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

MatchEventFeed.displayName = "MatchEventFeed";

export default MatchEventFeed;
