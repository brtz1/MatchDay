import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from "react";
const TeamContext = createContext({
    selectedPlayer: null,
    setSelectedPlayer: () => { },
    sellMode: false,
    setSellMode: () => { },
    renewMode: false,
    setRenewMode: () => { },
});
export function TeamProvider({ children }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [sellMode, setSellMode] = useState(false);
    const [renewMode, setRenewMode] = useState(false);
    return (_jsx(TeamContext.Provider, { value: {
            selectedPlayer,
            setSelectedPlayer,
            sellMode,
            setSellMode,
            renewMode,
            setRenewMode,
        }, children: children }));
}
export const useTeamContext = () => useContext(TeamContext);
//# sourceMappingURL=TeamContext.js.map