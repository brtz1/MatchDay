import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { ProgressBar } from "@/components/common/ProgressBar";
/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function PostMatchSummary() {
    // now reading matchdayId from the URL
    const { matchdayId } = useParams();
    const id = Number(matchdayId);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!id || isNaN(id)) {
            setError("Invalid matchday");
            setLoading(false);
            return;
        }
        setLoading(true);
        axios
            .get(`/match-summary/${id}`)
            .then(({ data }) => setData(data))
            .catch(() => setError("Failed to load post-match summary."))
            .finally(() => setLoading(false));
    }, [id]);
    if (loading)
        return _jsx(ProgressBar, { className: "w-64" });
    if (error)
        return _jsx("p", { className: "text-red-500", children: error });
    return (_jsxs("div", { className: "flex flex-col gap-4 p-4", children: [_jsxs("h1", { className: "text-xl font-bold text-blue-600 dark:text-blue-400", children: ["Post-Match Summary \u2014 Matchday ", id] }), data.map((m) => (_jsxs(AppCard, { variant: "outline", children: [_jsxs("h2", { className: "mb-2 text-md font-semibold", children: [m.home, " ", m.score, " ", m.away] }), m.events.length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: "No notable events." })) : (_jsx("ul", { className: "list-disc space-y-1 pl-4 text-sm text-gray-700 dark:text-gray-200", children: m.events.map((e, idx) => (_jsxs("li", { children: [e.minute, "\u2032 \u2014 ", _jsx("strong", { children: e.type }), ": ", e.desc] }, idx))) }))] }, m.matchId)))] }));
}
//# sourceMappingURL=PostMatchSummary.js.map