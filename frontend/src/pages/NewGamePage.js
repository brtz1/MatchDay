import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
export default function TitlePage() {
    const [canContinue, setCanContinue] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        fetch('http://localhost:4000/api/gamestate')
            .then(res => {
            if (!res.ok)
                throw new Error();
            return res.json();
        })
            .then(data => {
            if (data && data.coachTeamId)
                setCanContinue(true);
        })
            .catch(() => setCanContinue(false));
    }, []);
    return (_jsxs("div", { className: "h-screen flex flex-col items-center justify-center bg-green-800 text-white", children: [_jsxs("h1", { className: "text-6xl font-bold mb-10 tracking-wide", children: ["MatchDay! ", _jsx("span", { className: "text-sm align-top", children: "25" })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("button", { onClick: () => navigate('/new-game'), className: "bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded", children: "Start New Game" }), _jsx("button", { onClick: () => navigate('/load'), className: "bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded", children: "Load Game" }), canContinue && (_jsx("button", { onClick: () => navigate('/team'), className: "bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-8 rounded", children: "Continue" }))] })] }));
}
//# sourceMappingURL=NewGamePage.js.map