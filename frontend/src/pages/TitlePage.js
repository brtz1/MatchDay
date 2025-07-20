import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { AppButton } from "@/components/common/AppButton";
import { AppCard } from "@/components/common/AppCard";
/**
 * MatchDay! landing page with logo and three primary actions.
 */
export default function TitlePage() {
    const navigate = useNavigate();
    return (_jsxs("div", { className: "flex min-h-screen flex-col items-center justify-center bg-green-800 px-4 text-white", children: [_jsxs("h1", { className: "mb-12 text-6xl font-bold tracking-wide", children: ["MatchDay!", " ", _jsx("span", { className: "align-top text-sm text-white/70", children: "25" })] }), _jsxs(AppCard, { variant: "outline", className: "flex w-full max-w-xs flex-col gap-4 bg-white/10 p-6", children: [_jsx(AppButton, { onClick: () => navigate("/country-selection"), className: "w-full", children: "Start New Game" }), _jsx(AppButton, { variant: "secondary", onClick: () => navigate("/load-game"), className: "w-full", children: "Load Game" }), _jsx(AppButton, { variant: "ghost", onClick: () => navigate("/settings"), className: "w-full", children: "Settings" })] })] }));
}
//# sourceMappingURL=TitlePage.js.map