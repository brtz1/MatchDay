import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
export default function FullTimeResultsPage() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/results/latest");
                setResults(data);
            }
            catch (e) {
                console.error("Failed to fetch match results", e);
            }
            finally {
                setLoading(false);
            }
        })();
    }, []);
    const handleProceed = async () => {
        try {
            const { data } = await api.post("/matchday/advance-after-results");
            const coachTeamId = data.coachTeamId;
            navigate("/standings", { state: { coachTeamId } });
        }
        catch (error) {
            console.error("❌ Failed to advance after results:", error);
        }
    };
    if (loading) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-900 text-white", children: _jsx(ProgressBar, { className: "w-64" }) }));
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col gap-4 bg-green-900 p-4 text-white", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Full-Time Results" }), _jsx(AppCard, { variant: "outline", className: "bg-white/10 p-4", children: results.map((match) => (_jsx("div", { className: "mb-2 border-b border-white/20 pb-1", children: _jsxs("div", { className: "text-sm text-white/90", children: [match.division, " \u2013 ", match.homeTeam, " ", match.homeGoals, " x ", match.awayGoals, " ", match.awayTeam] }) }, match.id))) }), _jsx("div", { className: "mt-4 self-end", children: _jsx(AppButton, { onClick: handleProceed, children: "Proceed" }) })] }));
}
//# sourceMappingURL=FullTimeResultsPage.js.map