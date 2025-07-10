import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { getFlagUrl } from "../../utils/getFlagUrl";
export default function PlayerRoster({ players, selectedPlayer, onSelectPlayer }) {
    const positions = ["GK", "DF", "MF", "AT"];
    return (_jsxs("div", { className: "bg-white rounded-lg shadow p-3 text-black text-xs w-full h-full flex flex-col justify-between", children: [_jsxs("div", { className: "flex font-semibold border-b border-gray-300 pb-2 mb-2", children: [_jsx("span", { className: "w-[45%]", children: "Name" }), _jsx("span", { className: "w-[15%] text-right", children: "Salary" }), _jsx("span", { className: "w-[10%] text-right", children: "Rat" }), _jsx("span", { className: "w-[10%] text-right", children: "\uD83C\uDF10" }), _jsx("span", { className: "w-[10%] text-right", children: "C" })] }), _jsx("div", { className: "flex flex-col justify-start gap-2 overflow-hidden", children: positions.map((pos) => (_jsxs("div", { children: [_jsx("div", { className: "text-blue-700 text-xs font-bold uppercase tracking-wide mb-1", children: pos }), _jsx("div", { className: "rounded border border-gray-200 overflow-hidden bg-white", children: players
                                .filter((p) => p.position === pos)
                                .concat(Array.from({ length: 5 - players.filter((p) => p.position === pos).length }, (_, i) => ({
                                id: 1000 + i,
                                name: "",
                                position: pos,
                                rating: 0,
                                salary: 0,
                                nationality: "",
                                underContract: false,
                            })))
                                .map((p, idx) => (_jsx("div", { className: `flex items-center px-2 py-[3px] cursor-pointer ${selectedPlayer?.id === p.id
                                    ? "bg-yellow-200"
                                    : idx % 2 === 0
                                        ? "bg-gray-50"
                                        : "bg-white"} hover:bg-gray-100 border-b border-white last:border-b-0`, onClick: () => p.name && onSelectPlayer(p), style: { minHeight: "24px" }, children: p.name ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-[45%] truncate", children: p.name }), _jsxs("span", { className: "w-[15%] text-right", children: ["\u20AC", p.salary.toLocaleString()] }), _jsx("span", { className: "w-[10%] text-right", children: p.rating }), _jsx("span", { className: "w-[10%] text-right", children: p.nationality && (_jsx("img", { src: getFlagUrl(p.nationality), alt: p.nationality, className: "inline w-5 h-4" })) }), _jsx("span", { className: "w-[10%] text-right", children: p.underContract ? "🔒" : "🆓" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-[45%]", children: "\u00A0" }), _jsx("span", { className: "w-[15%] text-right", children: "\u00A0" }), _jsx("span", { className: "w-[10%] text-right", children: "\u00A0" }), _jsx("span", { className: "w-[10%] text-right", children: "\u00A0" }), _jsx("span", { className: "w-[10%] text-right", children: "\u00A0" })] })) }, p.id))) })] }, pos))) })] }));
}
//# sourceMappingURL=PlayerRoster.js.map