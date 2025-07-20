import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function FinancesTab({ finances }) {
    const totalSalary = finances.reduce((sum, f) => sum + (f.salary || 0), 0);
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-md font-medium mb-2", children: "Weekly Salary Breakdown" }), _jsx("ul", { className: "divide-y divide-gray-200", children: finances.map((player) => (_jsxs("li", { className: "py-2 flex justify-between", children: [_jsx("span", { children: player.name }), _jsxs("span", { className: "text-gray-800", children: ["$", player.salary.toLocaleString()] })] }, player.id))) })] }), _jsxs("div", { className: "pt-4 border-t border-gray-300 text-right", children: [_jsx("span", { className: "font-semibold text-gray-700", children: "Total: " }), _jsxs("span", { className: "text-black", children: ["$", totalSalary.toLocaleString()] })] })] }));
}
//# sourceMappingURL=FinancesTab.js.map