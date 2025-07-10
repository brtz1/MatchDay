import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useTeamContext } from "../../../context/TeamContext";
export default function SellTab() {
    const { selectedPlayer, setSellMode } = useTeamContext();
    const [minPrice, setMinPrice] = useState("");
    if (!selectedPlayer)
        return null;
    const handleSell = () => {
        if (!minPrice || isNaN(Number(minPrice))) {
            alert("Please enter a valid minimum price.");
            return;
        }
        alert(`Player ${selectedPlayer.name} is now for sale at €${Number(minPrice).toLocaleString()}`);
        setSellMode(false);
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("h2", { className: "text-blue-700 font-semibold", children: "Sell Player" }), _jsxs("p", { className: "text-sm", children: ["Player: ", _jsx("strong", { children: selectedPlayer.name })] }), _jsx("input", { type: "number", className: "border p-1 rounded text-sm w-full", placeholder: "Minimum price (\u20AC)", value: minPrice, onChange: (e) => setMinPrice(e.target.value) }), _jsxs("div", { className: "flex space-x-2 mt-2", children: [_jsx("button", { onClick: handleSell, className: "bg-blue-700 text-white px-3 py-1 rounded text-sm hover:bg-blue-800", children: "Confirm" }), _jsx("button", { onClick: () => setSellMode(false), className: "bg-gray-300 text-black px-3 py-1 rounded text-sm hover:bg-gray-400", children: "Back" })] })] }));
}
//# sourceMappingURL=SellTab.js.map