import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, } from "react";
/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */
const UiContext = createContext(undefined);
/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */
export function UiProvider({ children }) {
    /* Theme ----------------------------------------------------------------- */
    const preferred = localStorage.getItem("theme") ?? "system";
    const [theme, setTheme] = useState(preferred);
    /** Persist & apply <html class="dark"> toggle */
    useEffect(() => {
        localStorage.setItem("theme", theme);
        const isDark = theme === "dark" ||
            (theme === "system" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);
        document.documentElement.classList.toggle("dark", isDark);
    }, [theme]);
    function toggleTheme() {
        setTheme((t) => (t === "dark" ? "light" : "dark"));
    }
    /* Side-nav drawer ------------------------------------------------------- */
    const [sideNavOpen, setSideNavOpen] = useState(false);
    const openSideNav = () => setSideNavOpen(true);
    const closeSideNav = () => setSideNavOpen(false);
    /* Modal flag ------------------------------------------------------------ */
    const [modalOpen, setModalOpen] = useState(false);
    /* ---------------------------------------------------------------------- */
    const value = {
        theme,
        setTheme,
        toggleTheme,
        sideNavOpen,
        openSideNav,
        closeSideNav,
        modalOpen,
        setModalOpen,
    };
    return _jsx(UiContext.Provider, { value: value, children: children });
}
/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */
export function useUi() {
    const ctx = useContext(UiContext);
    if (!ctx) {
        throw new Error("useUi must be used inside <UiProvider>");
    }
    return ctx;
}
//# sourceMappingURL=UiContext.js.map