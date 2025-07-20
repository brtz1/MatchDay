import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "@/services/axios";
import { useTeamContext } from "@/store/TeamContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { teamUrl, newGameUrl } from "@/utils/paths";
export default function DrawPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setCurrentTeamId, setCurrentSaveGameId } = useTeamContext();
    const [selectedCountries, setSelectedCountries] = useState(null);
    const [coachName, setCoachName] = useState("");
    const [teamName, setTeamName] = useState("");
    const [userTeamId, setUserTeamId] = useState(null);
    const [divisionPreview, setDivisionPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Load selected countries
    useEffect(() => {
        const fromState = location.state?.selectedCountries;
        const fromStorage = localStorage.getItem("selectedCountries") ?? "[]";
        const parsed = fromState && Array.isArray(fromState) && fromState.length
            ? fromState
            : JSON.parse(fromStorage);
        if (parsed.length) {
            setSelectedCountries(parsed);
        }
        else {
            navigate(newGameUrl, { replace: true });
        }
    }, [location.state, navigate]);
    // If draw succeeded, update context and navigate
    useEffect(() => {
        if (userTeamId) {
            setCurrentTeamId(userTeamId);
            navigate(teamUrl(userTeamId), { replace: true });
        }
    }, [userTeamId, setCurrentTeamId, navigate]);
    const handleDraw = async () => {
        if (!coachName.trim()) {
            setError("Please enter your coach name");
            return;
        }
        if (!selectedCountries)
            return;
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.post("/save-game", {
                name: "New Save",
                coachName,
                countries: selectedCountries,
            });
            const { userTeamId, userTeamName, saveGameId, divisionPreview } = data;
            if (!userTeamId || !saveGameId) {
                throw new Error("Invalid draw response from server");
            }
            // Save game state
            setCurrentSaveGameId(saveGameId);
            setTeamName(userTeamName);
            setUserTeamId(userTeamId);
            setDivisionPreview(divisionPreview);
            localStorage.removeItem("selectedCountries");
            setLoading(false);
        }
        catch (err) {
            setError(err?.response?.data?.error ?? err.message ?? "Draw failed");
            setLoading(false);
        }
    };
    if (!selectedCountries) {
        return (_jsx("div", { className: "flex h-screen items-center justify-center bg-green-800 text-white", children: "Loading\u2026" }));
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-green-800 px-4 text-center text-white", children: [_jsx("h1", { className: "mb-6 text-5xl font-bold", children: "Draw Your Team" }), loading ? (_jsxs(AppCard, { className: "w-full max-w-md", children: [_jsx("p", { className: "mb-3 text-lg", children: "Drawing your team\u2026" }), _jsx(ProgressBar, {})] })) : error ? (_jsxs(AppCard, { className: "w-full max-w-md space-y-4", children: [_jsx("p", { className: "font-semibold text-red-400", children: error }), _jsx(AppButton, { variant: "secondary", className: "w-full", onClick: () => navigate(newGameUrl), children: "Back" })] })) : teamName ? (_jsxs(AppCard, { className: "w-full max-w-xl space-y-6 bg-white/10", children: [_jsxs("div", { children: [_jsx("p", { className: "mb-2 text-xl", children: "You will coach" }), _jsx("p", { className: "text-4xl font-bold text-yellow-400", children: teamName })] }), _jsxs("div", { className: "rounded-lg bg-white/10 p-4 text-left", children: [_jsx("h2", { className: "mb-2 text-lg font-semibold", children: "Division Preview" }), _jsx("ul", { className: "space-y-1 text-sm text-gray-200", children: divisionPreview.map((d, i) => (_jsx("li", { className: "border-b border-gray-700 py-1 last:border-b-0", children: d }, i))) })] }), _jsx(AppButton, { variant: "primary", className: "w-full", onClick: () => userTeamId && navigate(teamUrl(userTeamId), { replace: true }), children: "Let's Go!" })] })) : (_jsxs(AppCard, { className: "w-full max-w-md space-y-4", children: [_jsx("input", { value: coachName, onChange: (e) => setCoachName(e.target.value), placeholder: "Enter your coach name", className: "w-full rounded-md border border-gray-300 p-3 text-black dark:border-gray-600" }), _jsx(AppButton, { variant: "primary", className: "w-full", onClick: handleDraw, children: "Draw Team" })] }))] }));
}
//# sourceMappingURL=DrawPage.js.map