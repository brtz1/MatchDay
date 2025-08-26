import { jsx as _jsx } from "react/jsx-runtime";
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
 */
export default function App() {
    useEffect(() => {
        connectSocket(); // ✅ ensure the client actually connects
        return () => disconnectSocket();
    }, []);
    return (_jsx(UiProvider, { children: _jsx(GameStateProvider, { autoLoad: false, children: _jsx(TeamProvider, { children: _jsx(AppRouter, {}) }) }) }));
}
//# sourceMappingURL=App.js.map