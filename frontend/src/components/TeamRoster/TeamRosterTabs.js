import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import GameTab from './tabs/GameTab';
import PlayerTab from './tabs/PlayerTab';
import FormationTab from './tabs/FormationTab';
import OpponentTab from './tabs/OpponentTab';
import FinancesTab from './tabs/FinancesTab';
import SellTab from './tabs/SellTab';
import RenewTab from './tabs/RenewTab';
const tabs = ['Game', 'Player', 'Formation', 'Opponent', 'Finances', 'Sell', 'Renew'];
export default function TeamRosterTabs({ team, players, finances, selectedPlayer, onSelectPlayer, }) {
    const [activeTab, setActiveTab] = useState('Game');
    const renderTab = () => {
        switch (activeTab) {
            case 'Game':
                return _jsx(GameTab, { team: team });
            case 'Player':
                return _jsx(PlayerTab, { players: players, selectedPlayer: selectedPlayer, onSelectPlayer: onSelectPlayer });
            case 'Formation':
                return _jsx(FormationTab, { players: players });
            case 'Opponent':
                return _jsx(OpponentTab, { teamId: team.id });
            case 'Finances':
                return _jsx(FinancesTab, { finances: finances, budget: team.budget });
            case 'Sell':
                return _jsx(SellTab, { selectedPlayer: selectedPlayer });
            case 'Renew':
                return _jsx(RenewTab, { selectedPlayer: selectedPlayer });
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: "h-full w-full flex flex-col", children: [_jsx("div", { className: "flex gap-2 border-b p-2", children: tabs.map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab), className: `px-4 py-2 text-sm rounded-t ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-200'}`, children: tab }, tab))) }), _jsx("div", { className: "flex-1 overflow-auto bg-white p-4", children: renderTab() })] }));
}
//# sourceMappingURL=TeamRosterTabs.js.map