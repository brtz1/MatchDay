import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useTeamContext } from "@/store/TeamContext";
// Dummy logic — replace with your real save logic if needed
function useSaveGame() {
    const [saving, setSaving] = React.useState(false);
    const handleManualSave = () => {
        setSaving(true);
        setTimeout(() => {
            alert("Game saved! (placeholder)");
            setSaving(false);
        }, 1000);
    };
    return { handleManualSave, saving };
}
function TeamRosterToolbar() {
    const navigate = useNavigate();
    const { selectedPlayer, setSellMode } = useTeamContext();
    const { handleManualSave, saving } = useSaveGame();
    const menuDefs = [
        {
            key: "matchday",
            label: "Matchday",
            items: [
                {
                    label: saving ? "Saving…" : "Save Game",
                    onClick: handleManualSave,
                    disabled: saving,
                },
                { label: "Load Game", onClick: () => navigate("/load") },
                { label: "Exit without saving", onClick: () => alert("TODO") },
                { label: "Exit (Save)", onClick: () => alert("TODO") },
                { label: "About", onClick: () => alert("TODO") },
            ],
        },
        {
            key: "team",
            label: "Team",
            items: [
                { label: "Loan", onClick: () => alert("TODO") },
                { label: "Stadium", onClick: () => alert("TODO") },
                { label: "History", onClick: () => alert("TODO") },
            ],
        },
        {
            key: "player",
            label: "Player",
            items: [
                {
                    label: "Sell",
                    onClick: () => {
                        if (!selectedPlayer) {
                            alert("Select a player first!");
                            return;
                        }
                        setSellMode(true);
                        window.dispatchEvent(new CustomEvent("show-sell-tab"));
                    },
                },
                { label: "Scout", onClick: () => alert("TODO") },
                { label: "Search", onClick: () => navigate("/top-players") },
                { label: "Last Transfers", onClick: () => alert("TODO") },
            ],
        },
        {
            key: "league",
            label: "League",
            items: [
                { label: "Standings", onClick: () => navigate("/standings") },
                { label: "Golden Boot", onClick: () => alert("TODO") },
                { label: "Fixtures", onClick: () => alert("TODO") },
                { label: "Last Winners", onClick: () => alert("TODO") },
                { label: "Golden Boot History", onClick: () => alert("TODO") },
            ],
        },
        {
            key: "coach",
            label: "Coach",
            items: [
                { label: "Contract", onClick: () => alert("TODO") },
                { label: "Morale", onClick: () => alert("TODO") },
                { label: "Resign", onClick: () => alert("TODO") },
            ],
        },
    ];
    return (_jsx("div", { className: "flex gap-2", children: menuDefs.map((menu) => (_jsxs("div", { className: "relative group", children: [_jsx("button", { className: "rounded bg-white/10 px-3 py-1 text-sm shadow hover:bg-white/20", children: menu.label }), _jsx("div", { className: "absolute z-10 hidden w-max flex-col space-y-1 rounded bg-black/80 p-2 text-xs text-white shadow group-hover:flex", children: menu.items.map((item, index) => (_jsx("button", { onClick: item.onClick, disabled: item.disabled, className: "text-left disabled:opacity-50", children: item.label }, index))) })] }, menu.key))) }));
}
export default TeamRosterToolbar;
//# sourceMappingURL=TeamRosterToolbar.js.map