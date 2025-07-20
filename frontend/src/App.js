import { jsx as _jsx } from "react/jsx-runtime";
/* Global providers */
import { UiProvider } from "@/store/UiContext";
import { GameStateProvider } from "@/store/GameStateStore";
import { TeamProvider } from "@/store/TeamContext";
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
    return (_jsx(UiProvider, { children: _jsx(GameStateProvider, { children: _jsx(TeamProvider, { children: _jsx(AppRouter, {}) }) }) }));
}
//# sourceMappingURL=App.js.map