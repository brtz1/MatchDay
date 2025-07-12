import * as React from "react";

/* Global providers */
import { UiProvider } from "@/store/UiContext";
import { GameStateProvider } from "@/store/GameStateStore";
import { TeamProvider } from "@/store/TeamContext";
import NewGamePage from "./pages/NewGamePage";
import DrawResults from "./components/DrawResults";

/* Main router with all pages already wired */
import AppRouter from "@/routes/AppRouter";

/**
 * ---------------------------------------------------------------------------
 * Root React component
 * ---------------------------------------------------------------------------
 * – Wraps the whole app in context providers (UI, game-state, team-state).
 * – Delegates actual page routing to <AppRouter />.
 */
export default function App() {
  return (
    <UiProvider>
      <GameStateProvider>
        <TeamProvider>
          <AppRouter />
        </TeamProvider>
      </GameStateProvider>
    </UiProvider>
  );
}
