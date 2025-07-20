import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
const navLinks = [
    { label: "Team Roster", to: "/team" },
    { label: "Matchday", to: "/matchday" },
    { label: "Standings", to: "/standings" },
    { label: "Transfer Market", to: "/transfer-market" },
    { label: "Load Game", to: "/load-game" },
    { label: "Settings", to: "/settings" },
];
export const TopNavBar = () => {
    const location = useLocation();
    return (_jsxs("header", { className: "fixed top-0 left-0 right-0 z-50 h-12 bg-[#003366] text-white flex items-center justify-between px-4 font-mono text-sm border-b border-gray-500", children: [_jsx("div", { className: "font-bold tracking-widest uppercase text-yellow-300", children: "MatchDay!" }), _jsx("nav", { className: "flex gap-5", children: navLinks.map(({ label, to }) => (_jsx(Link, { to: to, className: clsx("hover:underline", location.pathname.startsWith(to) && "text-yellow-300 underline"), children: label }, to))) })] }));
};
export default TopNavBar;
//# sourceMappingURL=TopNavBar.js.map