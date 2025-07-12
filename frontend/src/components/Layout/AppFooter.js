import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
import clsx from "clsx";
/**
 * **AppFooter** – sticky site-wide footer with version & links.
 */
export function AppFooter({ className, version = import.meta.env.VITE_APP_VERSION ?? "dev", ...rest }) {
    return (_jsxs("footer", { className: clsx("flex flex-col items-center gap-2 border-t border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 md:flex-row md:justify-between", className), ...rest, children: [_jsxs("span", { children: ["\u00A9 2025\u00A0", _jsx("span", { className: "font-semibold text-gray-700 dark:text-gray-200", children: "MatchDay!" })] }), _jsxs("nav", { className: "flex gap-4", children: [_jsx(Link, { to: "/settings", className: "hover:text-gray-700 dark:hover:text-gray-200", children: "Settings" }), _jsx("a", { href: "https://github.com/your-org/matchday", target: "_blank", rel: "noopener noreferrer", className: "hover:text-gray-700 dark:hover:text-gray-200", children: "GitHub" })] }), _jsxs("span", { className: "md:ml-auto", children: ["v", version] })] }));
}
export default AppFooter;
//# sourceMappingURL=AppFooter.js.map