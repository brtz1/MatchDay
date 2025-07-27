import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// File: frontend/src/components/DrawResults.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTeamContext } from "@/store/TeamContext";
export default function DrawResults() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { setCurrentTeamId } = useTeamContext();
    const { userTeamName, userTeamId, divisionPreview } = state;
    // Set context as soon as this page mounts
    useEffect(() => {
        if (userTeamId) {
            setCurrentTeamId(userTeamId);
        }
    }, [userTeamId, setCurrentTeamId]);
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-2xl mb-4", children: "Draw Results" }), _jsxs("p", { className: "mb-4", children: [_jsx("strong", { children: "Your team:" }), " ", userTeamName, " (ID: ", userTeamId, ")"] }), _jsx("div", { className: "space-y-4", children: divisionPreview.map(line => {
                    const [div, ids] = line.split(':');
                    const list = ids.split(',').map(id => id.trim());
                    return (_jsxs("div", { children: [_jsx("h2", { className: "text-xl", children: div }), _jsx("ul", { className: "list-disc list-inside", children: list.map(id => (_jsx("li", { children: id }, id))) })] }, div));
                }) }), _jsx("button", { onClick: () => navigate(`/team/${userTeamId}`), className: "mt-6 px-4 py-2 bg-green-600 text-white rounded", children: "Go to Team Roster" })] }));
}
//# sourceMappingURL=DrawResults.js.map