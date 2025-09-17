import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const ROUND_ORDER = [
    "Round of 128",
    "Round of 64",
    "Round of 32",
    "Round of 16",
    "Quarterfinal",
    "Semifinal",
    "Final",
];
const STAGE_COUNTS = {
    "Round of 128": 64,
    "Round of 64": 32,
    "Round of 32": 16,
    "Round of 16": 8,
    Quarterfinal: 4,
    Semifinal: 2,
    Final: 1,
};
// Keep display order stable (matches your backend calendar mapping)
const STAGE_DAY = {
    "Round of 128": 3,
    "Round of 64": 6,
    "Round of 32": 8,
    "Round of 16": 11,
    Quarterfinal: 14,
    Semifinal: 17,
    Final: 20,
};
const DEPTH = {
    "Round of 64": 1,
    "Round of 32": 2,
    "Round of 16": 3,
    Quarterfinal: 4,
    Semifinal: 5,
};
/* --- sizing -------------------------------------------------------- */
const COL_W = 180; // side columns
const CTR_W = 200; // final
const COL_GAP = 12;
const CARD_W = 180;
const CARD_H = 50; // fixed two-line card height
/* A/B/C/D overlap tuning ------------------------------------------- */
const UNDER_OFFSET = 1; // lower column game sits just under higher's center
const PAIR_GAP = 1; // tiny breathing room between the two cards (visual)
/* Center-to-center spacing base (used by R128 pair math AND R64 ladder) */
const S1 = CARD_H + UNDER_OFFSET + 8;
/* ------------------------------------------------------------------ */
/* Utilities                                                          */
/* ------------------------------------------------------------------ */
function splitHalf(list) {
    const h = Math.floor(list.length / 2);
    return [list.slice(0, h), list.slice(h)];
}
/* Height of an R128 two-column group (A/B or C/D) with N pairs */
function r128GroupHeight(pairs) {
    // same formula used visually inside the R128 group
    return ((pairs - 1) * S1 +
        CARD_H + // higher#1 bottom
        (CARD_H / 2 + UNDER_OFFSET) + // offset to lower#1 top
        CARD_H // lower#1 height
    );
}
/* spacing for depth d: d=1 R64, d=2 R32, ... */
const COMPRESS = {
    2: 0.80, // Round of 32
    3: 0.72, // Round of 16
    4: 0.66, // Quarterfinal
    5: 0.62, // Semifinal
};
/* spacing for depth d: d=1 R64, d=2 R32, d=3 R16, d=4 QF, d=5 SF
   Uses compressed spacings so deeper rounds sit closer together.
   Also returns a 'between' value that RoundColumn uses directly. */
function spacingForDepth(depth) {
    // spacing[1] is R64 center-to-center spacing
    const spacing = [];
    spacing[1] = Math.round(S1);
    // first R64 center is the midpoint between A1(center) and B1(center)
    const A1center = CARD_H / 2;
    const B1center = CARD_H + UNDER_OFFSET;
    const firstCenter = (A1center + B1center) / 2;
    // top padding so the first row's TOP aligns with its computed center
    let pad = Math.round(firstCenter - CARD_H / 2);
    // build compressed spacing for deeper rounds and accumulate pad
    for (let d = 2; d <= depth; d++) {
        // baseline doubling then compress for this depth
        const doubled = spacing[d - 1] * 2;
        const k = COMPRESS[d] ?? 1;
        spacing[d] = Math.round(doubled * k);
        // vertical offset from previous round's centers to this round's centers
        pad += Math.round(spacing[d - 1] / 2);
    }
    const between = Math.max(0, Math.round(spacing[depth] - CARD_H));
    return { pad, between, centerSpacing: spacing[depth] };
}
/* final vertical pad (center between semifinals) */
function finalPad() {
    const { pad, centerSpacing } = spacingForDepth(5);
    const semiCenter = pad + CARD_H / 2;
    const finalCenter = semiCenter + centerSpacing / 2;
    return Math.round(finalCenter - CARD_H / 2);
}
/* Column content height helper for non-R128 anchors */
function columnContentHeight(nMatches, depth) {
    const { between } = spacingForDepth(depth);
    if (nMatches <= 0)
        return CARD_H; // minimal anchor
    return nMatches * CARD_H + (nMatches - 1) * between;
}
/* ---------- bracket completion helpers ---------------------------- */
const STAGE_INDEX = Object.fromEntries(ROUND_ORDER.map((s, i) => [s, i]));
function makePlaceholder(stage, idx) {
    const stageIdx = STAGE_INDEX[stage] ?? 0;
    // Negative, deterministic id (unique across stages)
    const id = -((stageIdx + 1) * 1000 + (idx + 1));
    return {
        id,
        homeTeamId: -1,
        awayTeamId: -1,
        homeTeam: "TBD",
        awayTeam: "TBD",
        homeGoals: null,
        awayGoals: null,
        matchdayNumber: STAGE_DAY[stage],
        stage,
    };
}
function isWinnerKnown(m) {
    return m.homeGoals != null && m.awayGoals != null && m.homeGoals !== m.awayGoals;
}
function winnerOf(m) {
    if (!isWinnerKnown(m))
        return null;
    if ((m.homeGoals ?? 0) > (m.awayGoals ?? 0)) {
        return { id: m.homeTeamId, name: m.homeTeam };
    }
    return { id: m.awayTeamId, name: m.awayTeam };
}
/** Build a map stage -> existing matches (sorted by matchdayNumber then id) */
function groupIncomingByStage(matches) {
    const m = new Map();
    for (const s of ROUND_ORDER)
        m.set(s, []);
    // push
    for (const x of matches) {
        if (ROUND_ORDER.includes(x.stage)) {
            m.get(x.stage).push(x);
        }
    }
    // sort each
    for (const s of ROUND_ORDER) {
        const arr = m.get(s);
        arr.sort((a, b) => a.matchdayNumber === b.matchdayNumber ? a.id - b.id : a.matchdayNumber - b.matchdayNumber);
    }
    return m;
}
/** Return a *complete* stage array, using real matches if present, else placeholders of proper length */
function padStageOrPlaceholders(stage, fromIncoming) {
    const expected = STAGE_COUNTS[stage];
    if (fromIncoming.length >= expected)
        return fromIncoming.slice(0, expected);
    // If there are fewer than expected (shouldn't happen with your backend), pad to expected
    const out = fromIncoming.slice();
    while (out.length < expected)
        out.push(makePlaceholder(stage, out.length));
    return out;
}
/** Derive a full stage from the previous stage by pairing winners: (0 vs 1), (2 vs 3), ... */
function deriveFromPrevious(stage, prevStageMatches) {
    const count = STAGE_COUNTS[stage];
    const out = [];
    for (let i = 0; i < count; i++) {
        const srcA = prevStageMatches[i * 2];
        const srcB = prevStageMatches[i * 2 + 1];
        const aWin = srcA ? winnerOf(srcA) : null;
        const bWin = srcB ? winnerOf(srcB) : null;
        const m = makePlaceholder(stage, i);
        if (aWin) {
            m.homeTeamId = aWin.id;
            m.homeTeam = aWin.name;
        }
        if (bWin) {
            m.awayTeamId = bWin.id;
            m.awayTeam = bWin.name;
        }
        out.push(m);
    }
    return out;
}
/* ------------------------------------------------------------------ */
/* Two-line card                                                      */
/* ------------------------------------------------------------------ */
function MatchCard({ m, side, showStub = true, }) {
    const nav = useNavigate();
    const hDisp = m.homeGoals == null ? "" : String(m.homeGoals);
    const aDisp = m.awayGoals == null ? "" : String(m.awayGoals);
    const homeClickable = m.homeTeamId > 0 && m.homeTeam !== "TBD";
    const awayClickable = m.awayTeamId > 0 && m.awayTeam !== "TBD";
    const btnCls = "grid w-full grid-cols-[1fr,auto] items-center gap-2 text-[12px] leading-tight";
    return (_jsxs("div", { className: "relative rounded-md border shadow bg-blue-800 text-white border-blue-400 px-2", style: { width: CARD_W, height: CARD_H, paddingTop: 6, paddingBottom: 6 }, children: [showStub && side !== "center" && (_jsx("div", { className: "absolute top-1/2 h-px bg-blue-300", style: side === "left"
                    ? { right: -10, width: 10, transform: "translateY(-0.5px)" }
                    : { left: -10, width: 10, transform: "translateY(-0.5px)" } })), homeClickable ? (_jsxs("button", { type: "button", onClick: () => nav(`/teams/${m.homeTeamId}`), title: m.homeTeam, className: btnCls, children: [_jsx("span", { className: "truncate text-left", children: m.homeTeam }), _jsx("span", { className: "rounded bg-blue-900/70 px-1.5 py-0.5 text-[11px] leading-none", children: hDisp })] })) : (_jsxs("div", { className: btnCls, children: [_jsx("span", { className: "truncate text-left opacity-80", children: m.homeTeam }), _jsx("span", { className: "rounded bg-blue-900/40 px-1.5 py-0.5 text-[11px] leading-none opacity-80", children: hDisp })] })), awayClickable ? (_jsxs("button", { type: "button", onClick: () => nav(`/teams/${m.awayTeamId}`), title: m.awayTeam, className: "mt-0.5 grid w-full grid-cols-[1fr,auto] items-center gap-2 text-[12px] leading-tight", children: [_jsx("span", { className: "truncate text-left", children: m.awayTeam }), _jsx("span", { className: "rounded bg-blue-900/70 px-1.5 py-0.5 text-[11px] leading-none", children: aDisp })] })) : (_jsxs("div", { className: "mt-0.5 grid w-full grid-cols-[1fr,auto] items-center gap-2 text-[12px] leading-tight", children: [_jsx("span", { className: "truncate text-left opacity-80", children: m.awayTeam }), _jsx("span", { className: "rounded bg-blue-900/40 px-1.5 py-0.5 text-[11px] leading-none opacity-80", children: aDisp })] }))] }));
}
/* ------------------------------------------------------------------ */
/* R128 Group: two columns with interleaved connectors                 */
/*  Left:  A (outer/high) + B (inner/low)                              */
/*  Right: D (inner/low) + C (outer/high)  → C is the edge column      */
/* ------------------------------------------------------------------ */
function R128Group({ title, higherList, // A (left) or C (right)
lowerList, // B (left) or D (right)
side, }) {
    const pairs = Math.max(higherList.length, lowerList.length);
    const height = r128GroupHeight(pairs);
    const trunkMargin = 6; // small reach into the gap toward R64
    const overlayWidth = COL_W * 2 + COL_GAP + trunkMargin;
    // trunk X inside overlay
    const trunkX = side === "left" ? COL_W * 2 + COL_GAP + (trunkMargin - 2) : (trunkMargin - 2);
    // COLUMN ORDER:
    //  - Left:  [higher(A), lower(B)]
    //  - Right: [lower(D),  higher(C)]  → edge column is higher (C)
    const firstColList = side === "left" ? higherList : lowerList;
    const secondColList = side === "left" ? lowerList : higherList;
    // edges for long/short lines
    const higherEdgeX = side === "left" ? COL_W : COL_W + COL_GAP + COL_W;
    const lowerEdgeX = side === "left" ? COL_W + COL_GAP + COL_W : COL_W;
    return (_jsxs("div", { style: {
            gridColumn: "span 2 / span 2",
            position: "relative",
            width: COL_W * 2 + COL_GAP,
        }, children: [_jsx("div", { className: "mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-blue-900/80", children: title }), _jsxs("div", { className: "grid", style: {
                    gridTemplateColumns: `${COL_W}px ${COL_W}px`,
                    columnGap: `${COL_GAP}px`,
                    position: "relative",
                    height,
                }, children: [_jsx("svg", { width: overlayWidth, height: height, className: "absolute", style: side === "left"
                            ? { left: 0, top: 0 }
                            : { right: 0, top: 0 }, children: Array.from({ length: pairs }).map((_, i) => {
                            const yHighTop = i * S1;
                            const yHighCenter = yHighTop + CARD_H / 2;
                            const yLowTop = yHighCenter + UNDER_OFFSET;
                            const yLowCenter = yLowTop + CARD_H / 2;
                            return (_jsxs("g", { children: [_jsx("line", { x1: higherEdgeX, y1: yHighCenter, x2: trunkX, y2: yHighCenter, stroke: "#93c5fd", strokeWidth: "2" }), _jsx("line", { x1: lowerEdgeX, y1: yLowCenter, x2: trunkX, y2: yLowCenter, stroke: "#93c5fd", strokeWidth: "2" }), _jsx("line", { x1: trunkX, y1: yHighCenter, x2: trunkX, y2: yLowCenter, stroke: "#93c5fd", strokeWidth: "2" })] }, i));
                        }) }), _jsx("div", { style: { position: "relative", height }, children: firstColList.map((m, i) => {
                            const isHigher = side === "left"; // on left, first col is higher; on right, first is lower
                            const top = isHigher ? i * S1 : i * S1 + CARD_H / 2 + UNDER_OFFSET;
                            return (_jsx("div", { style: { position: "absolute", top, left: 0 }, children: _jsx(MatchCard, { m: m, side: side, showStub: false }) }, m.id));
                        }) }), _jsx("div", { style: { position: "relative", height }, children: secondColList.map((m, i) => {
                            const isHigher = side === "right"; // on right, second column is higher
                            const top = isHigher ? i * S1 : i * S1 + CARD_H / 2 + UNDER_OFFSET;
                            return (_jsx("div", { style: { position: "absolute", top, left: 0 }, children: _jsx(MatchCard, { m: m, side: side, showStub: false }) }, m.id));
                        }) })] })] }));
}
/* ------------------------------------------------------------------ */
/* R64..SF columns: rows centered within the R128 group (vertical fit) */
/* ------------------------------------------------------------------ */
function RoundColumn({ title, matches, side, depth, anchorHeight, // height of the R128 group on this side (or fallback)
 }) {
    const { pad, between } = spacingForDepth(depth);
    // column content height (from top of first card to bottom of last card)
    const n = matches.length;
    const contentH = n * CARD_H + (n - 1) * between;
    // extra shift to center the whole column vertically within the anchor window
    const extraOffset = Math.max(0, Math.round((anchorHeight - contentH) / 2));
    return (_jsxs("div", { className: "flex min-w-[180px] flex-col", children: [_jsx("div", { className: "mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-blue-900/80", children: title }), _jsx("div", { className: "relative", style: { paddingTop: pad + extraOffset }, children: matches.map((m, i) => (_jsx("div", { style: { marginBottom: i < matches.length - 1 ? between : 0 }, children: _jsx(MatchCard, { m: m, side: side }) }, m.id))) })] }));
}
/* ------------------------------------------------------------------ */
/* Final column: always render (TBD if not determined)                 */
/* ------------------------------------------------------------------ */
function FinalColumn({ match }) {
    const pad = finalPad();
    return (_jsxs("div", { className: "flex min-w-[200px] flex-col", children: [_jsx("div", { className: "mb-2 text-center text-sm font-extrabold uppercase tracking-wide text-blue-900", children: "Final" }), _jsx("div", { className: "relative", style: { paddingTop: pad }, children: _jsx(MatchCard, { m: match, side: "center" }) })] }));
}
/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */
export default function CupBracket({ matches }) {
    const wrapRef = useRef(null);
    const gridRef = useRef(null);
    const [scale, setScale] = useState(1);
    const { leftA, leftB, // left R128: A outer/higher, B inner/lower
    rightC, rightD, // right R128: C outer/higher, D inner/lower
    roundsLeft, // R64..SF left (far→near)
    roundsRight, // R64..SF right (far→near)
    finalMatch, } = useMemo(() => {
        // 1) Group incoming real matches
        const grouped = groupIncomingByStage(matches);
        // 2) Build a complete bracket, stage by stage
        const fullByStage = new Map();
        // R128: either real (padded) or placeholders
        const r128Existing = grouped.get("Round of 128") ?? [];
        const r128 = padStageOrPlaceholders("Round of 128", r128Existing);
        fullByStage.set("Round of 128", r128);
        // For subsequent rounds:
        for (let si = 1; si < ROUND_ORDER.length; si++) {
            const stage = ROUND_ORDER[si];
            const existing = grouped.get(stage) ?? [];
            if (existing.length > 0) {
                // Use as-is (and pad if somehow short)
                fullByStage.set(stage, padStageOrPlaceholders(stage, existing));
                continue;
            }
            // Derive from previous stage winners
            const prev = fullByStage.get(ROUND_ORDER[si - 1]) ?? [];
            fullByStage.set(stage, deriveFromPrevious(stage, prev));
        }
        // 3) Split each stage into left/right halves for the layout
        const r128Full = fullByStage.get("Round of 128");
        const [left128, right128] = splitHalf(r128Full);
        const [A, B] = splitHalf(left128); // A higher (outer), B lower (inner)
        const [C, D] = splitHalf(right128); // C outer/higher, D inner/lower
        // For R64..SF: we build arrays of RoundBucket for left and right
        const roundsLeft = [];
        const roundsRight = [];
        for (const stage of ROUND_ORDER) {
            if (stage === "Round of 128" || stage === "Final")
                continue;
            const all = fullByStage.get(stage);
            const [L, R] = splitHalf(all);
            roundsLeft.push({ title: stage, matches: L });
            roundsRight.push({ title: stage, matches: R });
        }
        const finalMatch = fullByStage.get("Final")[0];
        return {
            leftA: A, leftB: B,
            rightC: C, rightD: D,
            roundsLeft, roundsRight,
            finalMatch,
        };
    }, [matches]);
    // R128 group heights used as vertical anchors for each side
    const leftAnchorH = r128GroupHeight(Math.max(leftA.length, leftB.length));
    const rightAnchorH = r128GroupHeight(Math.max(rightC.length, rightD.length));
    // columns count: 2 (R128 group) + R64 + R32 + R16 + QF + SF = 7 columns per side, plus Final
    const leftCols = 2 + 5;
    const rightCols = 2 + 5;
    // keep scale support (no scaling if container is large); anchored to left
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const grid = gridRef.current;
        if (!wrap || !grid)
            return;
        const ro = new ResizeObserver(() => {
            const naturalW = grid.scrollWidth;
            const naturalH = grid.scrollHeight;
            const availW = wrap.clientWidth;
            const availH = wrap.clientHeight;
            const s = Math.min(1, availW / Math.max(naturalW, 1), availH / Math.max(naturalH, 1));
            setScale(s);
        });
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [leftCols, rightCols]);
    const rightRoundsNearToFar = roundsRight.slice().reverse();
    // Always show every column (R128..SF on both sides) and Final in the center
    const gridCols = `repeat(${leftCols}, ${COL_W}px) ${CTR_W}px repeat(${rightCols}, ${COL_W}px)`;
    return (_jsx("div", { ref: wrapRef, className: "w-full h-full", children: _jsxs("div", { ref: gridRef, className: "grid", style: {
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                gap: `${COL_GAP}px`,
                gridTemplateColumns: gridCols,
            }, children: [_jsx(R128Group, { title: "Round of 128", higherList: leftA, lowerList: leftB, side: "left" }), roundsLeft.map((rb) => (_jsx(RoundColumn, { title: rb.title, matches: rb.matches, side: "left", depth: DEPTH[rb.title] ?? 1, anchorHeight: leftAnchorH }, `L-${rb.title}`))), _jsx(FinalColumn, { match: finalMatch }), rightRoundsNearToFar.map((rb) => (_jsx(RoundColumn, { title: rb.title, matches: rb.matches, side: "right", depth: DEPTH[rb.title] ?? 1, anchorHeight: rightAnchorH }, `R-${rb.title}`))), _jsx(R128Group, { title: "Round of 128", higherList: rightC, lowerList: rightD, side: "right" })] }) }));
}
//# sourceMappingURL=CupBracket.js.map