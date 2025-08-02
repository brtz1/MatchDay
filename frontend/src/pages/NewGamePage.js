import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// File: frontend/src/pages/NewGamePage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../services/axios';
export default function NewGamePage() {
    const navigate = useNavigate();
    const [coachName, setCoachName] = useState('');
    const [countries, setCountries] = useState([]);
    const [selectedCountries, setSelectedCountries] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => {
        axios.get('/countries')
            .then(res => setCountries(res.data))
            .catch(() => setError('Failed to load countries'));
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!coachName || selectedCountries.length === 0) {
            setError('Please enter your name and select at least one country.');
            return;
        }
        // ✅ Just navigate to DrawPage and pass data
        navigate("/draw", {
            state: {
                coachName,
                selectedCountries,
            },
        });
    };
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-2xl mb-4", children: "Start New Game" }), error && _jsx("p", { className: "text-red-600 mb-2", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block mb-1", children: "Coach Name" }), _jsx("input", { type: "text", value: coachName, onChange: e => setCoachName(e.target.value), className: "w-full p-2 border rounded" })] }), _jsxs("div", { children: [_jsx("label", { className: "block mb-1", children: "Select Countries" }), _jsx("select", { multiple: true, value: selectedCountries, onChange: e => {
                                    const opts = Array.from(e.target.selectedOptions, o => o.value);
                                    setSelectedCountries(opts);
                                }, className: "w-full p-2 border rounded", children: countries.map(c => (_jsx("option", { value: c.name, children: c.name }, c.code))) })] }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-blue-600 text-white rounded", children: "Draw Teams" })] })] }));
}
//# sourceMappingURL=NewGamePage.js.map