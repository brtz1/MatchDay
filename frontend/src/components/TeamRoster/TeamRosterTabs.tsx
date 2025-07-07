import { useState, useEffect } from 'react';
import GameTab from './tabs/GameTab';
import PlayerTab from './tabs/PlayerTab';
import FormationTab from './tabs/FormationTab';
import OpponentTab from './tabs/OpponentTab';
import FinancesTab from './tabs/FinancesTab';
import SellTab from './tabs/SellTab';
import RenewTab from './tabs/RenewTab';
import { useTeamContext } from '../../context/TeamContext';

interface Props {
  teamName: string;
  budget: number;
  morale: number | null;
}

export default function TeamRosterTabs({ teamName, budget, morale }: Props) {
  const [activeTab, setActiveTab] = useState("Game");
  const { selectedPlayer, sellMode, setSellMode, renewMode, setRenewMode } = useTeamContext();

  useEffect(() => {
    const handlerSell = () => setActiveTab("Sell");
    const handlerRenew = () => setActiveTab("Renew");
    window.addEventListener("show-sell-tab", handlerSell);
    window.addEventListener("show-renew-tab", handlerRenew);
    return () => {
      window.removeEventListener("show-sell-tab", handlerSell);
      window.removeEventListener("show-renew-tab", handlerRenew);
    };
  }, []);

  useEffect(() => {
    setSellMode(false);
    setRenewMode(false);
  }, [selectedPlayer]);

  return (
    <div className="bg-white rounded shadow p-2 text-xs">
      <div className="flex flex-wrap gap-1 mb-2">
        {["Game","Player","Formation","Opponent","Finances"]
          .concat(selectedPlayer && sellMode ? ["Sell"] : [])
          .concat(selectedPlayer && renewMode ? ["Renew"] : [])
          .map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSellMode(false);
                setRenewMode(false);
              }}
              className={`px-2 py-1 rounded ${
                activeTab === tab ? "bg-accent text-primary font-bold" : "bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
      </div>
      <div className="border-t pt-2">
        {activeTab === "Game" && <GameTab teamName={teamName} budget={budget} morale={morale} />}
        {activeTab === "Player" && <PlayerTab />}
        {activeTab === "Formation" && <FormationTab />}
        {activeTab === "Opponent" && <OpponentTab />}
        {activeTab === "Finances" && <FinancesTab />}
        {activeTab === "Sell" && selectedPlayer && sellMode && <SellTab player={selectedPlayer} />}
        {activeTab === "Renew" && selectedPlayer && renewMode && <RenewTab player={selectedPlayer} />}
      </div>
    </div>
  );
}
