import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/pages/NewGameSetup.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
export default function NewGameSetup() {
    const [countries, setCountries] = useState([]);
    const [selected, setSelected] = useState([]);
    const [clubCount, setClubCount] = useState(0);
    const navigate = useNavigate();
    useEffect(() => {
        axios.get('/api/countries')
            .then(res => setCountries(res.data))
            .catch(console.error);
    }, []);
    useEffect(() => {
        if (selected.length > 0) {
            axios.post('/api/club-count', { countries: selected })
                .then(res => setClubCount(res.data.count))
                .catch(() => setClubCount(0));
        }
    }, [selected]);
    const toggleCountry = (country) => {
        setSelected(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
    };
    const handleStart = async () => {
        try {
            const res = await axios.post('/api/new-game', { countries: selected });
            const coachTeamId = res.data.coachTeamId;
            const coachTeamName = res.data.coachTeamName;
            // Save the game state immediately
            await axios.post('/api/savegame', {
                name: 'Season 1',
                coachName: coachTeamName,
            });
            navigate(`/team/${coachTeamId}/roster`);
        }
        catch (err) {
            alert('Error starting new game. Check country selection.');
            console.error(err);
        }
    };
    return (_jsxs("div", { className: "p-6", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Select Countries" }), _jsx("div", { className: "grid grid-cols-3 gap-3 mb-6", children: countries.map(c => (_jsx("button", { className: `p-2 rounded border ${selected.includes(c) ? 'bg-yellow-400' : 'bg-white'}`, onClick: () => toggleCountry(c), children: c }, c))) }), _jsxs("p", { className: "mb-4", children: ["Selected: ", selected.length, " countries | Estimated clubs: ", clubCount] }), _jsx("button", { className: "px-4 py-2 bg-green-600 text-white rounded", onClick: handleStart, disabled: clubCount < 128, children: "Start Game" })] }));
}
//# sourceMappingURL=NewGameSetup.js.map