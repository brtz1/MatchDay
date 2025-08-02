import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import api from "@/services/axios";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getFlagUrl } from "@/utils/getFlagUrl";
export default function CountrySelectionPage() {
    const navigate = useNavigate();
    const [countries, setCountries] = useState([]);
    const [teamCounts, setTeamCounts] = useState({});
    const [selected, setSelected] = useState([]);
    const [coachName, setCoachName] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        api
            // Explicit full API path ensures correct endpoint hit
            .get("/countries")
            .then(({ data }) => {
            if (!Array.isArray(data.countries)) {
                throw new Error("Invalid response: countries must be an array");
            }
            setCountries(data.countries);
            setTeamCounts(data.teamCounts || {});
        })
            .catch(() => setError("Failed to load country list"))
            .finally(() => setLoading(false));
    }, []);
    const toggleCountry = (c) => setSelected((prev) => prev.includes(c) ? prev.filter((v) => v !== c) : [...prev, c]);
    const toggleSelectAll = () => {
        if (selected.length === countries.length) {
            setSelected([]);
        }
        else {
            setSelected([...countries]);
        }
    };
    const totalClubs = selected.reduce((sum, c) => sum + (teamCounts[c] ?? 0), 0);
    function handleStart() {
        if (!coachName.trim()) {
            setError("Please enter a coach name.");
            return;
        }
        if (totalClubs < 128) {
            setError("Pick enough countries to reach 128 clubs.");
            return;
        }
        localStorage.setItem("selectedCountries", JSON.stringify(selected));
        navigate("/draw", { state: { selectedCountries: selected, coachName } });
    }
    if (loading) {
        return (_jsx("div", { className: "flex min-h-screen items-center justify-center bg-green-900", children: _jsx(ProgressBar, { height: 1 }) }));
    }
    if (error) {
        return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-green-900 p-4", children: [_jsx("p", { className: "mb-4 text-red-400 font-semibold", children: error }), _jsx(AppButton, { onClick: () => window.location.reload(), children: "Retry" })] }));
    }
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-green-900 px-4 py-10 text-white", children: [_jsxs("h1", { className: "mb-10 text-6xl font-bold tracking-wide text-yellow-400", children: ["MatchDay! ", _jsx("span", { className: "align-top text-sm text-white/70", children: "25" })] }), _jsxs(AppCard, { className: "flex w-full max-w-6xl flex-col gap-6 bg-white/10 p-6 backdrop-blur-sm sm:flex-row", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h2", { className: "text-xl font-semibold", children: "Select Countries" }), _jsx("button", { onClick: toggleSelectAll, className: "rounded bg-yellow-400 px-3 py-1 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-50", children: selected.length === countries.length ? "Clear All" : "Select All" })] }), _jsxs("p", { className: "mb-4 text-gray-300", children: ["Pick countries until you hit ", _jsx("strong", { children: "128 clubs" }), "."] }), _jsx("div", { className: "max-h-[500px] overflow-y-auto rounded bg-white text-black", children: _jsxs("table", { className: "w-full table-auto border-collapse", children: [_jsx("thead", { className: "sticky top-0 bg-white", children: _jsxs("tr", { className: "border-b border-gray-300 text-left text-sm font-semibold text-yellow-600", children: [_jsx("th", { className: "p-2", children: "Flag" }), _jsx("th", { className: "p-2", children: "Country" }), _jsx("th", { className: "p-2", children: "Clubs" })] }) }), _jsx("tbody", { children: countries.map((c) => {
                                                const isSelected = selected.includes(c);
                                                return (_jsxs("tr", { onClick: () => toggleCountry(c), className: clsx("cursor-pointer border-b border-gray-300 transition-colors hover:bg-yellow-100", isSelected && "bg-yellow-200 font-bold"), children: [_jsx("td", { className: "p-2", children: _jsx("img", { src: getFlagUrl(c), alt: c, className: "h-4 w-6 rounded shadow", onError: (e) => (e.currentTarget.src =
                                                                    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=") }) }), _jsx("td", { className: "p-2", children: c }), _jsx("td", { className: "p-2", children: teamCounts[c] ?? 0 })] }, c));
                                            }) })] }) })] }), _jsxs(AppCard, { variant: "outline", className: "flex w-full flex-col items-center justify-between bg-white/10 sm:w-64", children: [_jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "mb-2 text-lg font-bold", children: "Selected Clubs" }), _jsx("p", { className: "text-3xl font-bold text-yellow-300", children: totalClubs }), _jsxs("p", { className: "mt-1 text-sm text-gray-300", children: ["from ", selected.length, " countries"] }), _jsx("div", { className: "mt-4 w-full", children: _jsx("input", { type: "text", placeholder: "Enter your coach name", value: coachName, onChange: (e) => setCoachName(e.target.value), className: "w-full rounded-md border border-gray-300 p-2 text-black" }) })] }), _jsx(AppButton, { onClick: handleStart, variant: "primary", className: "mt-6 w-full", children: "Start" })] })] })] }));
}
//# sourceMappingURL=CountrySelectionPage.js.map