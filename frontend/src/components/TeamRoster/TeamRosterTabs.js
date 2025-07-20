import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, Children, isValidElement, cloneElement, } from "react";
import clsx from "clsx";
/**
 * ---------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------
 */
export default function TeamRosterTabs({ tabs, value, defaultValue = tabs[0]?.value, onChange, children, className, }) {
    // Uncontrolled fallback
    const [internal, setInternal] = useState(defaultValue);
    const current = value ?? internal;
    function handleSelect(v) {
        onChange?.(v);
        if (value === undefined)
            setInternal(v);
    }
    // Development-time length guard
    if (import.meta.env.DEV &&
        Children.count(children) !== tabs.length) {
        console.warn("[TeamRosterTabs] children.length !== tabs.length");
    }
    return (_jsxs("div", { className: clsx("flex h-full flex-col rounded-lg bg-white shadow dark:bg-gray-900", className), children: [_jsx("div", { className: "flex shrink-0 gap-1 border-b border-gray-200 p-2 text-xs dark:border-gray-800", children: tabs.map((tab) => (_jsx("button", { onClick: () => handleSelect(tab.value), className: clsx("rounded px-2 py-1 font-medium transition-colors", current === tab.value
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"), children: tab.label }, tab.value))) }), _jsx("div", { className: "flex-1 overflow-auto p-2 text-sm", children: Children.map(children, (child, idx) => {
                    if (!isValidElement(child))
                        return null;
                    const isActive = tabs[idx]?.value === current;
                    return cloneElement(child, { hidden: !isActive });
                }) })] }));
}
//# sourceMappingURL=TeamRosterTabs.js.map