import { useState, useEffect } from "react";
import GameTab from "./tabs/GameTab";
import PlayerTab from "./tabs/PlayerTab";
import FormationTab from "./tabs/FormationTab";
import OpponentTab from "./tabs/OpponentTab";
import FinancesTab from "./tabs/FinancesTab";
import SellTab from "./tabs/SellTab";
import RenewTab from "./tabs/RenewTab";
import { useTeamContext } from "../../context/TeamContext";

export default function TeamRosterTabs({
  teamName,
  budget,
  morale,
}: {
  teamName: string;
  budget: number;
  morale: number | null;
}) {
  const {
    selectedPlayer,
    sellMode,
    setSellMode,
    renewMode,
    setRenewMode,
  } = useTeamContext();

  const [selectedTab, setSelectedTab] = useState("Game");

  useEffect(() => {
    if (!sellMode && selectedTab === "Sell") {
      setSelectedTab("Player");
    }
    if (!renewMode && selectedTab === "Renew") {
      setSelectedTab("Player");
    }
  }, [sellMode, renewMode, selectedTab]);

  const tabs = ["Game", "Player", "Formation", "Opponent", "Finances"];

  if (sellMode && selectedPlayer) tabs.push("Sell");
  if (renewMode && selectedPlayer) tabs.push("Renew");

  return (
    <div className="bg-white rounded-lg shadow p-2 text-xs h-full flex flex-col">
      <div className="flex flex-wrap justify-between mb-2 border-b border-gray-300 text-xs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`px-3 py-1 rounded-t ${
              selectedTab === tab
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700"
            } hover:bg-blue-600 hover:text-white transition`}
            onClick={() => setSelectedTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 rounded border border-gray-200 bg-white p-2 overflow-y-auto">
        {selectedTab === "Game" && (
          <GameTab teamName={teamName} budget={budget} morale={morale} />
        )}
        {selectedTab === "Player" && selectedPlayer && (
          <PlayerTab player={selectedPlayer} />
        )}
        {selectedTab === "Formation" && <FormationTab />}
        {selectedTab === "Opponent" && <OpponentTab />}
        {selectedTab === "Finances" && <FinancesTab budget={budget} />}
        {selectedTab === "Sell" && selectedPlayer && sellMode && (
          <SellTab player={selectedPlayer} onBack={() => setSellMode(false)} />
        )}
        {selectedTab === "Renew" && selectedPlayer && renewMode && (
          <RenewTab
            player={selectedPlayer}
            onBack={() => setRenewMode(false)}
          />
        )}
      </div>
    </div>
  );
}
