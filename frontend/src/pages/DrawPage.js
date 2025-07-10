import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
export default function DrawPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedCountries, setSelectedCountries] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [coachName, setCoachName] = useState('');
    const [teamName, setTeamName] = useState('');
    const [divisionPreview, setDivisionPreview] = useState([]); // 👈 Add division info here
    // Step 1: Retrieve selectedCountries
    useEffect(() => {
        const fromState = location.state?.selectedCountries;
        const fromStorage = localStorage.getItem('selectedCountries');
        if (fromState?.length) {
            setSelectedCountries(fromState);
            localStorage.setItem('selectedCountries', JSON.stringify(fromState));
        }
        else if (fromStorage) {
            try {
                const parsed = JSON.parse(fromStorage);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSelectedCountries(parsed);
                }
                else {
                    navigate('/');
                }
            }
            catch {
                navigate('/');
            }
        }
        else {
            navigate('/');
        }
    }, [location.state, navigate]);
    const startGame = async () => {
        if (!coachName.trim()) {
            setError('Please enter your name');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('http://localhost:4000/api/save-game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'New Save',
                    coachName,
                    countries: selectedCountries,
                }),
            });
            const data = await res.json();
            console.log('🎲 Draw response:', data);
            if (!res.ok || !data.userTeamName) {
                throw new Error(data.error || 'No team received from server');
            }
            setTeamName(data.userTeamName);
            setDivisionPreview(data.divisionPreview || []); // 👈 Add this in your backend
            setLoading(false);
            localStorage.removeItem('selectedCountries');
        }
        catch (err) {
            console.error('❌ Error during draw:', err);
            setError(err.message || 'Error starting game');
            setLoading(false);
        }
    };
    if (!selectedCountries) {
        return (_jsx("div", { className: "h-screen flex items-center justify-center bg-green-800 text-white text-xl", children: "Loading selected countries..." }));
    }
    return (_jsxs("div", { className: "h-screen flex flex-col items-center justify-center bg-green-800 text-white text-center px-4", children: [_jsx("h1", { className: "text-5xl font-bold mb-6", children: "Draw Your Team" }), loading ? (_jsx("p", { className: "text-xl", children: "Drawing your team..." })) : error ? (_jsxs("div", { children: [_jsx("p", { className: "text-red-400 mb-4", children: error }), _jsx("button", { onClick: () => navigate('/'), className: "bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white font-semibold", children: "Back to Menu" })] })) : teamName ? (_jsxs("div", { children: [_jsx("p", { className: "text-3xl mb-4", children: "You have been assigned to:" }), _jsx("p", { className: "text-5xl font-bold text-yellow-400 mb-6", children: teamName }), _jsxs("div", { className: "bg-white bg-opacity-10 rounded p-4 my-4 text-left max-w-xl mx-auto", children: [_jsx("h2", { className: "text-xl font-semibold mb-2", children: "Division Preview" }), _jsx("ul", { className: "text-sm text-gray-200", children: divisionPreview.map((entry, idx) => (_jsx("li", { className: "py-1 border-b border-gray-500", children: entry }, idx))) })] }), _jsx("button", { onClick: () => navigate('/team'), className: "bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded", children: "Let's Go!" })] })) : (_jsxs("div", { className: "max-w-md w-full space-y-6", children: [_jsx("input", { type: "text", value: coachName, onChange: (e) => setCoachName(e.target.value), placeholder: "Enter your coach name", className: "w-full p-3 rounded text-black text-lg" }), _jsx("button", { onClick: startGame, className: "bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded", children: "Draw Team" })] }))] }));
}
//# sourceMappingURL=DrawPage.js.map