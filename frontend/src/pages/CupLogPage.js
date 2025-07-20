import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import api from '@/services/axios';
import CupBracket from '@/components/cup/CupBracket';
export default function CupLogPage() {
    const [matches, setMatches] = useState([]);
    useEffect(() => {
        api
            .get('/cup/log')
            .then((res) => setMatches(res.data))
            .catch((err) => console.error('Failed to load cup log:', err));
    }, []);
    return (_jsxs("div", { className: "p-4", children: [_jsx("h1", { className: "text-2xl font-bold mb-4", children: "Cup Bracket" }), _jsx(CupBracket, { matches: matches })] }));
}
//# sourceMappingURL=CupLogPage.js.map