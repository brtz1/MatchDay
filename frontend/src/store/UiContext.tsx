import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Theme = "light" | "dark" | "system";

export interface UiContextType {
  /** App-wide colour scheme: `"light" | "dark" | "system"` */
  theme: Theme;
  setTheme: (mode: Theme) => void;
  toggleTheme: () => void;

  /** Mobile / small-screen hamburger drawer */
  sideNavOpen: boolean;
  openSideNav: () => void;
  closeSideNav: () => void;

  /** Global modal blocking flag (used by Modal component) */
  modalOpen: boolean;
  setModalOpen: (v: boolean) => void;
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

const UiContext = createContext<UiContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/* Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function UiProvider({ children }: { children: ReactNode }) {
  /* Theme ----------------------------------------------------------------- */
  const preferred =
    (localStorage.getItem("theme") as Theme | null) ?? "system";
  const [theme, setTheme] = useState<Theme>(preferred);

  /** Persist & apply <html class="dark"> toggle */
  useEffect(() => {
    localStorage.setItem("theme", theme);
    const isDark =
      theme === "dark" ||
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
  const value: UiContextType = {
    theme,
    setTheme,
    toggleTheme,
    sideNavOpen,
    openSideNav,
    closeSideNav,
    modalOpen,
    setModalOpen,
  };

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
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
