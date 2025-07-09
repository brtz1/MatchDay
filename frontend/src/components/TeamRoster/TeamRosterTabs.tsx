import { useState } from 'react';
import GameTab from './tabs/GameTab';
import PlayerTab from './tabs/PlayerTab';
import FormationTab from './tabs/FormationTab';
import OpponentTab from './tabs/OpponentTab';
import FinancesTab from './tabs/FinancesTab';
import SellTab from './tabs/SellTab';
import RenewTab from './tabs/RenewTab';
import { Player, Team, Finance } from '@/types';

interface TeamRosterTabsProps {
  team: Team;
  players: Player[];
  finances: Finance[];
  selectedPlayer: Player | null;
  onSelectPlayer: (player: Player) => void;
}

const tabs = ['Game', 'Player', 'Formation', 'Opponent', 'Finances', 'Sell', 'Renew'];

export default function TeamRosterTabs({
  team,
  players,
  finances,
  selectedPlayer,
  onSelectPlayer,
}: TeamRosterTabsProps) {
  const [activeTab, setActiveTab] = useState('Game');

  const renderTab = () => {
    switch (activeTab) {
      case 'Game':
        return <GameTab team={team} />;
      case 'Player':
        return <PlayerTab players={players} selectedPlayer={selectedPlayer} onSelectPlayer={onSelectPlayer} />;
      case 'Formation':
        return <FormationTab players={players} />;
      case 'Opponent':
        return <OpponentTab teamId={team.id} />;
      case 'Finances':
        return <FinancesTab finances={finances} budget={team.budget} />;
      case 'Sell':
        return <SellTab selectedPlayer={selectedPlayer} />;
      case 'Renew':
        return <RenewTab selectedPlayer={selectedPlayer} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex gap-2 border-b p-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm rounded-t ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-200'}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto bg-white p-4">
        {renderTab()}
      </div>
    </div>
  );
}
