import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function PlayerTab({ players, selectedPlayer, onSelectPlayer }) {
    return (_jsx("div", { className: "space-y-2", children: players.map((player) => (_jsx("div", { onClick: () => onSelectPlayer(player), className: `p-2 rounded border cursor-pointer ${selectedPlayer?.id === player.id ? 'bg-primary text-white' : 'hover:bg-gray-100'}`, children: _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: player.name }), _jsxs("span", { className: "text-sm text-gray-500", children: [player.position, " \u2013 ", player.rating] })] }) }, player.id))) }));
}
//# sourceMappingURL=PlayerTab.js.map