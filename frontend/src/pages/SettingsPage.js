import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useUi } from "@/store/UiContext";
import { AppCard } from "@/components/common/AppCard";
import { AppButton } from "@/components/common/AppButton";
import { formatDate } from "@/utils/formatter";
/**
 * SettingsPage
 * ------------
 * Lets the user switch theme, clear localStorage and view build metadata.
 * Extend it later with audio toggles, key-bindings, etc.
 */
export default function SettingsPage() {
    const { theme, setTheme, toggleTheme } = useUi();
    /* Clear game state but keep user prefs */
    function handleHardReset() {
        if (window.confirm("This will clear saved game-state and reload the page. Continue?")) {
            localStorage.clear();
            window.location.reload();
        }
    }
    /* Build info can come from Vite env vars */
    const BUILD_TIME = import.meta.env.VITE_BUILD_TIME ?? "";
    return (_jsxs("div", { className: "mx-auto flex max-w-lg flex-col gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-extrabold text-blue-600 dark:text-blue-400", children: "Settings" }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-3 text-xl font-bold", children: "Appearance" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "theme", value: "light", checked: theme === "light", onChange: () => setTheme("light") }), "Light"] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "theme", value: "dark", checked: theme === "dark", onChange: () => setTheme("dark") }), "Dark"] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "theme", value: "system", checked: theme === "system", onChange: () => setTheme("system") }), "System"] }), _jsx(AppButton, { variant: "secondary", className: "ml-auto", onClick: toggleTheme, children: "Toggle" })] })] }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-3 text-xl font-bold", children: "Storage" }), _jsx("p", { className: "mb-4 text-sm", children: "Clear cached save-games and preferences. The page will reload." }), _jsx(AppButton, { variant: "destructive", onClick: handleHardReset, children: "Hard Reset" })] }), _jsxs(AppCard, { children: [_jsx("h2", { className: "mb-2 text-xl font-bold", children: "About" }), _jsxs("p", { className: "text-sm", children: ["MatchDay! build\u00A0", _jsx("span", { className: "font-mono", children: BUILD_TIME || "dev" }), _jsx("br", {}), BUILD_TIME && (_jsxs(_Fragment, { children: ["Built on\u00A0", formatDate(Number(BUILD_TIME))] }))] })] })] }));
}
//# sourceMappingURL=SettingsPage.js.map