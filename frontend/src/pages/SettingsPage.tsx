import * as React from "react";
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
    if (
      window.confirm(
        "This will clear saved game-state and reload the page. Continue?"
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  }

  /* Build info can come from Vite env vars */
  const BUILD_TIME = import.meta.env.VITE_BUILD_TIME ?? "";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
        Settings
      </h1>

      {/* Theme switch ---------------------------------------------------- */}
      <AppCard>
        <h2 className="mb-3 text-xl font-bold">Appearance</h2>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              value="light"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
            />
            Light
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
            />
            Dark
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              value="system"
              checked={theme === "system"}
              onChange={() => setTheme("system")}
            />
            System
          </label>

          <AppButton
            variant="secondary"
            className="ml-auto"
            onClick={toggleTheme}
          >
            Toggle
          </AppButton>
        </div>
      </AppCard>

      {/* Storage reset --------------------------------------------------- */}
      <AppCard>
        <h2 className="mb-3 text-xl font-bold">Storage</h2>
        <p className="mb-4 text-sm">
          Clear cached save-games and preferences. The page will reload.
        </p>
        <AppButton
          variant="destructive"
          onClick={handleHardReset}
        >
          Hard Reset
        </AppButton>
      </AppCard>

      {/* Build meta ------------------------------------------------------ */}
      <AppCard>
        <h2 className="mb-2 text-xl font-bold">About</h2>
        <p className="text-sm">
          MatchDay! build&nbsp;
          <span className="font-mono">
            {BUILD_TIME || "dev"}
          </span>
          <br />
          {BUILD_TIME && (
            <>
              Built on&nbsp;
              {formatDate(Number(BUILD_TIME))}
            </>
          )}
        </p>
      </AppCard>
    </div>
  );
}
