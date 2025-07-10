import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function FormationTab() {
    const [formation, setFormation] = useState(null);
    const formations = ["3-3-4", "3-4-3", "4-2-4", "4-3-3", "4-4-2", "4-5-1", "5-2-3", "5-3-2", "5-4-1", "5-5-0", "6-3-1", "6-4-0"];
    const handleSetFormation = (value) => {
        setFormation(value);
    };
    return (_jsxs("div", { children: [_jsx("p", { className: "font-bold text-accent mb-2", children: "Select Formation" }), _jsxs("select", { className: "border p-1 rounded w-full mb-2 text-black", onChange: (e) => handleSetFormation(e.target.value), value: formation ?? "", children: [_jsx("option", { value: "", children: "-- Select --" }), formations.map((f) => (_jsx("option", { value: f, children: f }, f)))] }), _jsx("button", { className: `rounded px-2 py-1 mt-2 ${formation
                    ? "bg-primary text-black hover:bg-yellow-400"
                    : "bg-gray-300 cursor-not-allowed"}`, disabled: !formation, onClick: () => alert(`Proceeding to match with ${formation}!`), children: "Matchday" })] }));
}
//# sourceMappingURL=FormationTab.js.map