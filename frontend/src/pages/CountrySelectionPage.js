import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import axios from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";
/* ------------------------------------------------------------------------- */
/* Component                                                                 */
/* ------------------------------------------------------------------------- */
export default function CountrySelectionPage() {
    const navigate = useNavigate();
    const [countries, setCountries] = useState([]);
    const [teamCounts, setTeamCounts] = useState({});
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    /* ─────────────────────────────── Load list */
    useEffect(() => {
        axios
            .get("/countries")
            .then(({ data }) => {
            if (!data?.countries)
                throw new Error("Invalid response");
            setCountries(data.countries);
            setTeamCounts(data.teamCounts);
        })
            .catch(() => setError("Failed to load country list"))
            .finally(() => setLoading(false));
    }, []);
    /* ─────────────────────────────── Helpers */
    const toggleCountry = (c) => setSelected((prev) => prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]);
    const totalClubs = selected.reduce((sum, c) => sum + (teamCounts[c] ?? 0), 0);
    /* ─────────────────────────────── Start */
    function handleStart() {
        if (totalClubs < 128) {
            setError("Pick enough countries to reach 128 clubs.");
            return;
        }
        navigate("/draw", { state: { selectedCountries: selected } });
    }
    /* ----------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ----------------------------------------------------------------------- */
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-green-900 px-4 py-10 text-white", children: [_jsxs("h1", { className: "mb-10 text-6xl font-bold tracking-wide text-yellow-400", children: ["MatchDay!", " ", _jsx("span", { className: "align-top text-sm text-white/70", children: "25" })] }), _jsxs(AppCard, { className: "flex w-full max-w-6xl flex-col gap-6 bg-white/10 p-6 backdrop-blur-sm sm:flex-row", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "mb-2 text-xl font-semibold", children: "Select Countries" }), _jsxs("p", { className: "mb-4 text-gray-300", children: ["Pick countries until you hit ", _jsx("strong", { children: "128 clubs" }), "."] }), error && (_jsx("p", { className: "mb-4 font-semibold text-red-400", children: error })), loading ? (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(ProgressBar, { height: 0.5 }), _jsx("span", { children: "Loading countries\u2026" })] })) : (_jsxs("table", { className: "w-full overflow-hidden rounded bg-white text-black", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-300 text-left text-sm font-semibold text-yellow-600", children: [_jsx("th", { className: "p-2", children: "Flag" }), _jsx("th", { className: "p-2", children: "Country" }), _jsx("th", { className: "p-2", children: "Clubs" })] }) }), _jsx("tbody", { children: countries.map((c) => {
                                            const selectedRow = selected.includes(c);
                                            return (_jsxs("tr", { onClick: () => toggleCountry(c), className: clsx("cursor-pointer border-b border-gray-300 transition-colors hover:bg-yellow-100", selectedRow && "bg-yellow-200 font-bold"), children: [_jsx("td", { className: "p-2", children: _jsx("img", { src: getFlagUrl(c), alt: c, className: "h-4 w-6 rounded shadow" }) }), _jsx("td", { className: "p-2", children: c }), _jsx("td", { className: "p-2", children: teamCounts[c] ?? 0 })] }, c));
                                        }) })] }))] }), _jsxs(AppCard, { variant: "outline", className: "flex w-full flex-col items-center justify-between bg-white/10 sm:w-64", children: [_jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "mb-2 text-lg font-bold", children: "Selected Clubs" }), _jsx("p", { className: "text-3xl font-bold text-yellow-300", children: totalClubs }), _jsxs("p", { className: "mt-1 text-sm text-gray-300", children: ["from ", selected.length, " countries"] })] }), _jsx(AppButton, { onClick: handleStart, variant: "primary", className: "mt-6 w-full", children: "Start" })] })] })] }));
}
//# sourceMappingURL=CountrySelectionPage.js.map