import * as React from "react";
import {
  forwardRef,
  type HTMLAttributes,
  Fragment,
  useMemo,
} from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Clock from "@/components/MatchBroadcast/Clock";

/**
 * ---------------------------------------------------------------------------
 * Types
 * ---------------------------------------------------------------------------
 */

export interface TickerGame {
  id: string | number;
  division: string | number;
  home: {
    id: string | number;
    name: string;
    score: number;
  };
  away: {
    id: string | number;
    name: string;
    score: number;
  };
  /** Current minute (or >90 for added time). */
  minute: number;
  /** Latest short event summary (optional). */
  latestEvent?: React.ReactNode;
}

export interface MatchTickerProps
  extends HTMLAttributes<HTMLDivElement> {
  games: TickerGame[];
  /** Coached team for highlight. */
  coachTeamId?: string | number;
  /** Click callback – passes game id. */
  onGameClick?: (gameId: TickerGame["id"]) => void;
}

/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */

export const MatchTicker = forwardRef<
  HTMLDivElement,
  MatchTickerProps
>(({ games, coachTeamId, onGameClick, className, ...rest }, ref) => {
  /** Group games by division for header sections. */
  const grouped = useMemo(() => {
    return games.reduce(
      (acc, game) => {
        const key = game.division;
        if (!acc[key]) acc[key] = [];
        acc[key].push(game);
        return acc;
      },
      {} as Record<string | number, TickerGame[]>
    );
  }, [games]);

  return (
    <div
      ref={ref}
      className={clsx("space-y-6", className)}
      {...rest}
    >
      {Object.entries(grouped)
        .sort(([a], [b]) =>
          String(a).localeCompare(String(b), undefined, {
            numeric: true,
          })
        )
        .map(([division, list]) => (
          <Fragment key={division}>
            {/* Division header */}
            <h3 className="border-l-4 border-blue-600 pl-2 text-sm font-semibold uppercase text-gray-700 dark:text-gray-300">
              Division {division}
            </h3>

            <div className="space-y-1">
              {list.map((g) => {
                const isCoach =
                  g.home.id === coachTeamId ||
                  g.away.id === coachTeamId;

                return (
                  <button
                    key={g.id}
                    onClick={() => onGameClick?.(g.id)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                      "hover:bg-gray-100 dark:hover:bg-gray-800",
                      isCoach &&
                        "ring-1 ring-inset ring-blue-500/50"
                    )}
                  >
                    {/* Teams & score */}
                    <div className="flex flex-1 items-center gap-2">
                      <TeamBox
                        name={g.home.name}
                        highlight={g.home.id === coachTeamId}
                      />
                      <span className="text-sm font-semibold tabular-nums">
                        {g.home.score}
                      </span>

                      <ChevronRight className="h-4 w-4 text-gray-400" />

                      <span className="text-sm font-semibold tabular-nums">
                        {g.away.score}
                      </span>
                      <TeamBox
                        name={g.away.name}
                        highlight={g.away.id === coachTeamId}
                      />
                    </div>

                    {/* Clock */}
                    <Clock
                      minute={g.minute}
                      showProgress={false}
                      className="w-16"
                    />
                  </button>
                );
              })}
            </div>
          </Fragment>
        ))}
    </div>
  );
});

MatchTicker.displayName = "MatchTicker";

/**
 * ---------------------------------------------------------------------------
 * Helper – TeamBox
 * ---------------------------------------------------------------------------
 */

function TeamBox({
  name,
  highlight,
}: {
  name: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={clsx(
        "truncate rounded-md px-2 py-0.5 text-xs font-medium",
        highlight
          ? "bg-blue-600 text-white dark:bg-blue-500"
          : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100"
      )}
      style={{ maxWidth: "7rem" }}
      title={name}
    >
      {name}
    </span>
  );
}

export default MatchTicker;
