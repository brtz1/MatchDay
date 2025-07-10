import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
const MainMenu = () => {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "h-screen flex flex-col items-center justify-center gap-6 bg-green-800 text-white", children: [_jsx("h1", { className: "text-4xl font-bold", children: "MatchDay!" }), _jsxs("div", { className: "flex flex-col gap-4 mt-6", children: [_jsx("button", { className: "bg-white text-green-800 font-semibold px-6 py-2 rounded-xl shadow", onClick: () => navigate('/new-game'), children: "Start New Game" }), _jsx("button", { className: "bg-white text-green-800 font-semibold px-6 py-2 rounded-xl shadow", onClick: () => navigate('/load-game'), children: "Load Game" })] })] }));
};
export default MainMenu;
//# sourceMappingURL=MainMenu.js.map