import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Helper to get flag image URL
const getFlagUrl = (country) => {
    const isoMap = {
        'England': 'gb-eng',
        'Scotland': 'gb-sct',
        'Wales': 'gb-wls',
        'Northern Ireland': 'gb-nir',
        'United States': 'us',
        'South Korea': 'kr',
    };
    const override = isoMap[country];
    const code = override || country.slice(0, 2).toLowerCase();
    return `https://flagcdn.com/w40/${code}.png`;
};
export default function CountrySelector() {
    const navigate = useNavigate();
    const [countries, setCountries] = useState([]);
    const [selected, setSelected] = useState([]);
    const [teamCounts, setTeamCounts] = useState({});
    const [error, setError] = useState('');
    useEffect(() => {
        fetch('http://localhost:4000/api/countries')
            .then(res => res.json())
            .then(data => {
            if (!data.countries || !data.teamCounts) {
                setError('Invalid country data from server');
                return;
            }
            setCountries(data.countries);
            setTeamCounts(data.teamCounts);
        })
            .catch(() => setError('Failed to load countries'));
    }, []);
    const toggleCountry = (country) => {
        setSelected(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
    };
    const handleStart = () => {
        const totalTeams = selected.reduce((sum, country) => sum + (teamCounts[country] || 0), 0);
        if (totalTeams < 128) {
            setError('Please select enough countries to reach 128 teams');
            return;
        }
        console.log('Navigating to /draw with:', selected);
        navigate('/draw', { state: { selectedCountries: selected } });
    };
    const totalSelectedClubs = selected.reduce((sum, country) => sum + (teamCounts[country] || 0), 0);
    return (_jsxs("div", { className: "h-screen flex flex-col items-center justify-center bg-green-900 text-white px-4", children: [_jsxs("h1", { className: "text-6xl font-bold mb-10 tracking-wide text-yellow-400", children: ["MatchDay! ", _jsx("span", { className: "text-sm align-top", children: "25" })] }), _jsxs("div", { className: "bg-white bg-opacity-10 p-6 rounded-lg shadow-md w-full max-w-5xl mb-6 flex flex-col sm:flex-row gap-6", children: [_jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "text-xl mb-4 font-semibold", children: "Select Countries" }), _jsx("p", { className: "mb-4 text-gray-300", children: "Pick countries to form the league (128 teams minimum)." }), error && _jsx("p", { className: "text-red-400 mb-4 font-semibold", children: error }), _jsxs("table", { className: "w-full bg-white text-black rounded overflow-hidden", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-yellow-600 border-b border-gray-300 text-left text-lg", children: [_jsx("th", { className: "p-2", children: "Flag" }), _jsx("th", { className: "p-2", children: "Country" }), _jsx("th", { className: "p-2", children: "Clubs" })] }) }), _jsx("tbody", { children: countries.map((country) => (_jsxs("tr", { onClick: () => toggleCountry(country), className: `cursor-pointer hover:bg-yellow-100 transition border-b border-gray-300
                    ${selected.includes(country) ? 'bg-yellow-200 font-bold' : ''}`, children: [_jsx("td", { className: "p-2", children: _jsx("img", { src: getFlagUrl(country), alt: country, className: "w-6 h-4 rounded shadow" }) }), _jsx("td", { className: "p-2", children: country }), _jsx("td", { className: "p-2", children: teamCounts[country] || 0 })] }, country))) })] })] }), _jsxs("div", { className: "w-full sm:w-64 bg-white bg-opacity-10 rounded p-4 text-center flex flex-col justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-bold mb-2", children: "Selected Clubs" }), _jsx("p", { className: "text-3xl font-bold text-yellow-300", children: totalSelectedClubs }), _jsxs("p", { className: "text-sm text-gray-300 mt-1", children: ["from ", selected.length, " countries"] })] }), _jsx("button", { onClick: handleStart, className: "bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded mt-6", children: "Start" })] })] })] }));
}
//# sourceMappingURL=CountrySelector.js.map