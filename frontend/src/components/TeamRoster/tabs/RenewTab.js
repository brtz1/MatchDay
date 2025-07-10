import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useTeamContext } from "../../../context/TeamContext";
export default function RenewTab() {
    const { selectedPlayer, setRenewMode } = useTeamContext();
    const [wageOffer, setWageOffer] = useState("");
    if (!selectedPlayer)
        return null;
    const handleRenew = () => {
        if (!wageOffer || isNaN(Number(wageOffer))) {
            alert("Please enter a valid wage.");
            return;
        }
        alert(`Proposed €${Number(wageOffer).toLocaleString()} to ${selectedPlayer.name}`);
        setRenewMode(false);
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-blue-700 font-semibold", children: "Renew Contract" }), _jsxs("p", { className: "text-sm", children: ["Player: ", _jsx("strong", { children: selectedPlayer.name })] }), _jsx("input", { type: "number", className: "border p-1 rounded text-sm w-full", placeholder: "Wage offer (\u20AC)", value: wageOffer, onChange: (e) => setWageOffer(e.target.value) }), _jsxs("div", { className: "flex space-x-2 mt-2", children: [_jsx("button", { onClick: handleRenew, className: "bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800", children: "Propose" }), _jsx("button", { onClick: () => setRenewMode(false), className: "bg-gray-300 text-black px-3 py-1 rounded text-sm hover:bg-gray-400", children: "Back" })] })] }));
}
//# sourceMappingURL=RenewTab.js.map