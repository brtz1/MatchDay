import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeamContext } from '../../context/TeamContext';
export default function TeamRosterToolbar() {
    const [open, setOpen] = useState(null);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();
    const { selectedPlayer, setSellMode } = useTeamContext();
    const toggle = (menu) => {
        setOpen(open === menu ? null : menu);
    };
    const handleManualSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('http://localhost:4000/api/manual-save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Manual Save', coachName: 'Coach' }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`✅ Game saved as "${data.saveName}"`);
            }
            else {
                alert(`❌ Save failed: ${data.error}`);
            }
        }
        catch (err) {
            alert('❌ Save failed.');
        }
        setSaving(false);
        setOpen(null);
    };
    return (_jsxs("nav", { className: "bg-accent text-primary p-2 rounded shadow flex gap-4 text-xs relative", children: [_jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => toggle('matchday'), className: "hover:underline", children: "Matchday" }), open === 'matchday' && (_jsxs("ul", { className: "absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10", children: [_jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", onClick: handleManualSave, children: saving ? 'Saving...' : 'Save Game' }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", onClick: () => {
                                    setOpen(null);
                                    navigate('/load-game');
                                }, children: "Load Game" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Exit without saving" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Exit (Save)" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "About" })] }))] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => toggle('team'), className: "hover:underline", children: "Team" }), open === 'team' && (_jsxs("ul", { className: "absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10", children: [_jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Loan" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Stadium" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "History" })] }))] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => toggle('player'), className: "hover:underline", children: "Player" }), open === 'player' && (_jsxs("ul", { className: "absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10", children: [_jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", onClick: () => {
                                    if (selectedPlayer) {
                                        setOpen(null);
                                        setSellMode(true);
                                        window.dispatchEvent(new CustomEvent("show-sell-tab"));
                                    }
                                    else {
                                        alert("Select a player first!");
                                    }
                                }, children: "Sell" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Scout" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Search" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Last Transfers" })] }))] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => toggle('league'), className: "hover:underline", children: "League" }), open === 'league' && (_jsxs("ul", { className: "absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10", children: [_jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Standings" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Golden Boot" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Fixtures" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Last Winners" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Golden Boot History" })] }))] }), _jsxs("div", { className: "relative", children: [_jsx("button", { onClick: () => toggle('coach'), className: "hover:underline", children: "Coach" }), open === 'coach' && (_jsxs("ul", { className: "absolute left-0 bg-white border rounded shadow text-black text-xs p-1 z-10", children: [_jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Contract" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Morale" }), _jsx("li", { className: "hover:bg-gray-100 px-2 py-1 cursor-pointer", children: "Resign" })] }))] })] }));
}
//# sourceMappingURL=Toolbar.js.map