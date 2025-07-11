import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
export default function SaveGameList() {
    const [saves, setSaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const navigate = useNavigate();
    useEffect(() => {
        fetch('http://localhost:4000/api/save-game?includeTeams=true')
            .then(res => {
            if (!res.ok)
                throw new Error('Failed to fetch saves');
            return res.json();
        })
            .then(data => {
            setSaves(data);
            setLoading(false);
        })
            .catch(err => {
            console.error(err);
            setError('Could not load save games');
            setLoading(false);
        });
    }, []);
    const loadSave = async (id, saveName) => {
        const confirmed = window.confirm(`Load save "${saveName}"? Unsaved progress will be lost.`);
        if (!confirmed)
            return;
        setLoadingId(id);
        try {
            const res = await fetch('http://localhost:4000/api/save-game/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (!res.ok)
                throw new Error('Failed to load game');
            const data = await res.json();
            if (!data.coachTeamId)
                throw new Error('Missing coach team ID from response');
            navigate(`/save-game-teams/${data.coachTeamId}`);
        }
        catch (err) {
            console.error(err);
            setError('Failed to load selected save game');
            setLoadingId(null);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-green-900 text-white flex flex-col items-center py-12 px-4", children: [_jsx("h1", { className: "text-4xl font-bold mb-6", children: "Load Save Game" }), loading && _jsx("p", { children: "Loading save games..." }), error && _jsx("p", { className: "text-red-400", children: error }), !loading && !error && (_jsx("div", { className: "w-full max-w-xl space-y-4", children: saves.map((save) => {
                    const coachTeam = save.teams?.find(t => t.division === 'D4');
                    return (_jsxs("div", { className: "bg-white bg-opacity-10 rounded p-4 flex justify-between items-center shadow", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xl font-semibold", children: save.name }), _jsxs("p", { className: "text-sm text-gray-300", children: ["Coach: ", save.coachName || 'Unknown', " \u2014 Team: ", coachTeam?.name || 'D4 team', _jsx("br", {}), "Created: ", new Date(save.createdAt).toLocaleString()] })] }), _jsx("button", { onClick: () => loadSave(save.id, save.name), disabled: loadingId === save.id, className: `px-4 py-2 rounded bg-blue-500 hover:bg-blue-700 text-white font-semibold ${loadingId === save.id ? 'opacity-50 cursor-wait' : ''}`, children: loadingId === save.id ? 'Loading...' : 'Resume' })] }, save.id));
                }) })), _jsxs("div", { className: "mt-10 space-x-4", children: [_jsx("button", { onClick: () => navigate('/'), className: "bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white font-semibold", children: "Back to Menu" }), _jsx("button", { onClick: () => navigate('/new-game'), className: "bg-yellow-500 hover:bg-yellow-600 px-6 py-2 rounded text-black font-semibold", children: "Start New Game" })] })] }));
}
//# sourceMappingURL=LoadGamePage.js.map