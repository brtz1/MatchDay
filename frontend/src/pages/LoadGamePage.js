import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { teamUrl, titlePageUrl, newGameUrl } from "@/utils/paths";
/* ── Component ─────────────────────────────────────────────────────── */
export default function LoadGamePage() {
    const navigate = useNavigate();
    const { setCurrentTeamId, setCurrentSaveGameId } = useTeamContext();
    const [saves, setSaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    useEffect(() => {
        axios
            .get("/save-game", { params: { includeTeams: true } })
            .then(({ data }) => setSaves(data))
            .catch(() => setError("Could not load saved games."))
            .finally(() => setLoading(false));
    }, []);
    async function handleLoad(saveGameId, saveName) {
        const confirmed = window.confirm(`Load save "${saveName}"?\nUnsaved progress will be lost.`);
        if (!confirmed)
            return;
        setLoadingId(saveGameId);
        setError(null);
        try {
            const { data } = await axios.post("/save-game/load", {
                id: saveGameId,
            });
            if (!data.coachTeamId) {
                throw new Error("Missing coach team ID from save");
            }
            setCurrentSaveGameId(saveGameId);
            setCurrentTeamId(data.coachTeamId);
            navigate(teamUrl(data.coachTeamId));
        }
        catch (err) {
            console.error(err);
            setError("Failed to load save game.");
            setLoadingId(null);
        }
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center gap-8 bg-green-900 px-4 py-12 text-white", children: [_jsx("h1", { className: "text-4xl font-bold", children: "Load Save-Game" }), loading ? (_jsx(ProgressBar, { className: "w-64" })) : error ? (_jsx("p", { className: "font-semibold text-red-400", children: error })) : saves.length === 0 ? (_jsx("p", { className: "text-gray-200", children: "No saves found. Start a new game to begin!" })) : (_jsx("div", { className: "w-full max-w-2xl space-y-4", children: saves.map((save) => {
                    const previewTeam = save.teams[0];
                    return (_jsxs(AppCard, { variant: "outline", className: "flex items-center justify-between bg-white/10", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xl font-semibold", children: save.name }), _jsxs("p", { className: "text-sm text-gray-300", children: ["Coach: ", save.coachName || "Unknown", " \u2014 Team:", " ", previewTeam?.name || "N/A", " ", _jsx("br", {}), "Created: ", new Date(save.createdAt).toLocaleString()] })] }), _jsx(AppButton, { onClick: () => handleLoad(save.id, save.name), isLoading: loadingId === save.id, children: loadingId === save.id ? "Loading…" : "Resume" })] }, save.id));
                }) })), _jsxs("div", { className: "mt-10 flex gap-4", children: [_jsx(AppButton, { variant: "secondary", onClick: () => navigate(titlePageUrl), children: "Back to Menu" }), _jsx(AppButton, { variant: "primary", onClick: () => navigate(newGameUrl), children: "Start New Game" })] })] }));
}
//# sourceMappingURL=LoadGamePage.js.map