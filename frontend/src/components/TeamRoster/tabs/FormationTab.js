import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const FORMATIONS = [
    "3-3-4", "3-4-3", "4-2-4", "4-3-3", "4-4-2", "4-5-1",
    "5-2-3", "5-3-2", "5-4-1", "5-5-0", "6-3-1", "6-4-0",
];
export default function FormationTab({ onSetFormation }) {
    const [formation, setFormation] = useState(null);
    const [loading, setLoading] = useState(false);
    const handleApply = async () => {
        if (!formation)
            return;
        setLoading(true);
        try {
            await onSetFormation(formation);
        }
        catch (err) {
            console.error("Error applying formation:", err);
            alert("Failed to apply formation");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-2 font-bold text-accent", children: "Select Formation" }), _jsxs("select", { className: "mb-2 w-full rounded border p-1 text-black", value: formation ?? "", onChange: (e) => setFormation(e.target.value), children: [_jsx("option", { value: "", children: "-- Select --" }), FORMATIONS.map((f) => (_jsx("option", { value: f, children: f }, f)))] }), _jsx("button", { onClick: handleApply, disabled: !formation || loading, className: `mt-2 w-full rounded px-2 py-1 ${formation
                    ? "bg-primary text-black hover:bg-yellow-400"
                    : "cursor-not-allowed bg-gray-300"}`, children: loading ? "Setting Formation..." : "Confirm Formation" })] }));
}
//# sourceMappingURL=FormationTab.js.map