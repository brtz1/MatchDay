import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNextMatch } from "@/services/teamService";
import { useGameState } from "@/store/GameStateStore";
function cupStageBySeasonMd(md) {
    switch (md) {
        case 3: return "Round of 128";
        case 6: return "Round of 64";
        case 9: return "Round of 32";
        case 12: return "Round of 16";
        case 15: return "Quarterfinal";
        case 18: return "Semifinal";
        case 21: return "Final";
        default: return "—";
    }
}
function safeTeamLabel(name, id) {
    if (name && name.trim().length > 0)
        return name;
    return typeof id === "number" ? `Team ${id}` : "Unknown team";
}
function TeamLink({ id, name }) {
    const label = safeTeamLabel(name, id);
    if (typeof id !== "number")
        return _jsx("span", { className: "opacity-80", children: label });
    return (_jsx(Link, { to: `/teams/${id}`, className: "underline hover:opacity-80", children: label }));
}
/**
 * Best-effort H2H fetcher:
 * 1) Tries to use whatever export exists in @/services/matchService.
 * 2) Falls back to GET /api/matches/last-head-to-head?homeId=&awayId=
 * Accepts shapes: { text } | { summary } | { result } | string.
 */
async function fetchLastH2H(homeId, awayId) {
    // Try dynamic import of the service to avoid compile errors from missing named exports
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = await import("@/services/matchService");
        const fn = mod?.getLastHeadToHead ??
            mod?.getHeadToHeadSummary ??
            mod?.getLastH2H;
        if (typeof fn === "function") {
            const res = await fn(homeId, awayId);
            if (!res)
                return null;
            if (typeof res === "string")
                return res;
            if (typeof res === "object") {
                if (typeof res.text === "string")
                    return res.text;
                if (typeof res.summary === "string")
                    return res.summary;
                if (typeof res.result === "string")
                    return res.result;
            }
            try {
                return JSON.stringify(res);
            }
            catch {
                return String(res);
            }
        }
    }
    catch {
        // ignore and try HTTP fallback
    }
    // HTTP fallback (keep endpoint in sync with your backend)
    try {
        const qs = new URLSearchParams({ homeId: String(homeId), awayId: String(awayId) });
        const resp = await fetch(`/api/matches/last-head-to-head?${qs.toString()}`);
        if (resp.ok) {
            const data = await resp.json();
            const t = data?.text ?? data?.summary ?? data?.result ?? null;
            return typeof t === "string" ? t : null;
        }
    }
    catch {
        // network errors -> null
    }
    return null;
}
export default function GameTab({ teamId, teamName, morale }) {
    const [match, setMatch] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [lastResult, setLastResult] = useState(null);
    // Read GameState to label the upcoming simulated matchday (fallback to match payload)
    const { currentMatchday: seasonMd, matchdayType: seasonType } = useGameState();
    useEffect(() => {
        let cancelled = false;
        setLoaded(false);
        setError(null);
        setLastResult(null);
        // Fetch for the DISPLAYED TEAM (not the coached team)
        getNextMatch(teamId)
            .then(async (m) => {
            if (cancelled)
                return;
            setMatch(m ?? null);
            setLoaded(true);
            if (m) {
                try {
                    const h2hText = await fetchLastH2H(m.homeTeamId, m.awayTeamId);
                    if (!cancelled)
                        setLastResult(h2hText);
                }
                catch {
                    if (!cancelled)
                        setLastResult(null);
                }
            }
        })
            .catch((err) => {
            console.error("Failed to load next match:", err);
            if (!cancelled) {
                setError("Failed to load next match.");
                setLoaded(true);
            }
        });
        return () => {
            cancelled = true;
        };
        // Re-fetch when switching team page OR when matchday advances
    }, [teamId, seasonMd]);
    if (!loaded)
        return _jsx("p", { children: "Loading next match..." });
    if (error)
        return _jsx("p", { className: "text-error", children: error });
    if (!match)
        return _jsx("p", { children: "Next Fixture: \u2014" });
    // Prefer GameState; fall back to match payload if needed
    const mdNum = typeof seasonMd === "number" && seasonMd > 0
        ? seasonMd
        : match.matchdayNumber ?? undefined;
    const mdType = (seasonType ?? match.matchdayType ?? "LEAGUE");
    const legText = mdType === "LEAGUE"
        ? mdNum
            ? mdNum <= 7
                ? "League 1st leg"
                : "League 2nd leg"
            : "League —"
        : `Cup ${mdNum ? cupStageBySeasonMd(mdNum) : "—"}`;
    return (_jsxs("div", { children: [_jsxs("p", { className: "mb-1 font-bold text-accent", children: ["Next Fixture for ", teamName, ":"] }), _jsx("p", { className: "text-sm mb-1", children: `Matchday ${mdNum ?? "—"}: ${legText}` }), _jsxs("p", { className: "text-sm", children: [_jsx(TeamLink, { id: match.homeTeamId, name: match.homeTeamName }), " ", _jsx("span", { className: "opacity-70", children: "x" }), " ", _jsx(TeamLink, { id: match.awayTeamId, name: match.awayTeamName })] }), _jsxs("p", { className: "text-sm", children: ["Referee: ", match.refereeName ?? "Unknown"] }), _jsxs("p", { className: "text-sm", children: ["Last result: ", lastResult ? lastResult : "First match-up!"] }), _jsx("hr", { className: "my-3" }), _jsxs("p", { className: "text-sm", children: ["Coach Morale: ", morale !== null ? `${morale}%` : "N/A"] })] }));
}
//# sourceMappingURL=GameTab.js.map