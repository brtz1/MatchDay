import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
export default function TitlePage() {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "h-screen flex flex-col items-center justify-center bg-green-800 text-white", children: [_jsxs("h1", { className: "text-6xl font-bold mb-10 tracking-wide", children: ["MatchDay! ", _jsx("span", { className: "text-sm align-top", children: "25" })] }), _jsxs("div", { className: "flex flex-col space-y-4 w-64", children: [_jsx("button", { onClick: () => navigate('/new-game'), className: "bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded", children: "Start New Game" }), _jsx("button", { onClick: () => navigate('/load'), className: "bg-gray-500 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded", children: "Load Game" }), _jsx("button", { onClick: () => alert('Settings coming soon'), className: "bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 px-6 rounded", children: "Settings" })] })] }));
}
//# sourceMappingURL=TitlePage.js.map