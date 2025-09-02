// frontend/src/App.tsx

import * as React from "react";
import { useEffect } from "react";

/* Global providers */
import { UiProvider } from "@/store/UiContext";
import { GameStateProvider } from "@/store/GameStateStore";
import { TeamProvider } from "@/store/TeamContext";

/* Main router with all pages already wired */
import AppRouter from "@/routes/AppRouter";

/* Socket */
import { connectSocket, disconnectSocket } from "@/socket";

/**
 * ---------------------------------------------------------------------------
 * Root React component
 * ---------------------------------------------------------------------------
 * – Connects Socket.IO once on app mount (and disconnects on unmount).
 * – Wraps the whole app in context providers (UI, game-state, team-state).
 * – Delegates actual page routing to <AppRouter />.
 *
 * IMPORTANT:
 * To prevent redirects back to Title right after clicking “Go to Matchday Live”,
 * we force the GameState store to auto-load. This guarantees that
 * `currentSaveGameId` and `gameStage` are populated for any route guards.
 */
export default function App() {
  useEffect(() => {
    connectSocket(); // ensure the client actually connects
    return () => disconnectSocket();
  }, []);

  return (
    <UiProvider>
      {/* Force eager load so guards don't see a transient empty state */}
      <GameStateProvider autoLoad={true}>
        <TeamProvider>
          <AppRouter />
        </TeamProvider>
      </GameStateProvider>
    </UiProvider>
  );
}
