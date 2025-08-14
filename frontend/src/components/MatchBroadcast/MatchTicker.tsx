import React from "react";

export type TickerEvent = { minute: number; type: string; text: string };
export type TickerTeam = { id: number; name: string; score: number };
export type TickerGame = {
  id: number;
  division: string;
  minute: number;
  home: TickerTeam;
  away: TickerTeam;
  events?: TickerEvent[]; // we will show only the latest one
};

interface Props {
  games: TickerGame[];
  onGameClick?: (matchId: number) => void;
  onTeamClick?: (p: { matchId: number; teamId: number; isHome: boolean }) => void;
  showMinute?: boolean;
  groupByDivision?: boolean;
}

const divisionOrder = ["D1", "D2", "D3", "D4", "DIST"];

export default function MatchTicker({
  games,
  onGameClick,
  onTeamClick,
  showMinute = false,
  groupByDivision = false,
}: Props) {
  const grouped = React.useMemo(() => {
    if (!groupByDivision) return { order: ["ALL"], groups: { ALL: games } as Record<string, TickerGame[]> };
    const groups: Record<string, TickerGame[]> = {};
    for (const d of divisionOrder) groups[d] = [];
    for (const g of games) (groups[g.division] ?? (groups[g.division] = [])).push(g);
    const order = divisionOrder.filter((d) => (groups[d] ?? []).length > 0);
    return { order, groups };
  }, [games, groupByDivision]);

  return (
    <div className="flex flex-col gap-4">
      {grouped.order.map((key) => (
        <div key={key} className="rounded-xl border border-white/10">
          {groupByDivision && (
            <div className="px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white/80">
              {label(key)}
            </div>
          )}
          <ul className="divide-y divide-white/10">
            {(grouped.groups[key] ?? []).map((g) => {
              const latest = (g.events ?? []).slice(-1)[0];
              return (
                <li
                  key={g.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-white/5 cursor-pointer"
                  onClick={() => onGameClick?.(g.id)}
                >
                  <div className="flex items-center gap-2">
                    {showMinute && <span className="w-10 text-right tabular-nums">{g.minute}'</span>}

                    {/* Left team name (clickable) */}
                    <span
                      className="font-semibold hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTeamClick?.({ matchId: g.id, teamId: g.home.id, isHome: true });
                      }}
                    >
                      {g.home.name}
                    </span>

                    {/* Scoreboard "x" style */}
                    <span className="tabular-nums font-semibold">
                      {" "}{g.home.score}{" "}x{" "}{g.away.score}{" "}
                    </span>

                    {/* Right team name (clickable) */}
                    <span
                      className="font-semibold hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTeamClick?.({ matchId: g.id, teamId: g.away.id, isHome: false });
                      }}
                    >
                      {g.away.name}
                    </span>
                  </div>

                  {/* Latest event only */}
                  <div className="flex items-center gap-2 text-xs opacity-90">
                    {latest && (
                      <span className="rounded bg-white/10 px-2 py-0.5 tabular-nums">
                        {latest.minute}' {latest.text}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function label(code: string) {
  switch (code) {
    case "D1": return "Division 1";
    case "D2": return "Division 2";
    case "D3": return "Division 3";
    case "D4": return "Division 4";
    case "DIST": return "Distrital";
    default: return code;
  }
}
