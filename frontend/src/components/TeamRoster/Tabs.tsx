import { useState } from 'react';

export default function TeamRosterTabs() {
  const [activeTab, setActiveTab] = useState("Game");

  return (
    <div className="bg-white rounded shadow p-2">
      <div className="flex gap-2 mb-2 text-xs">
        {["Game", "Player", "Formation", "Opponent", "Finances", "Sell", "Renew"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-1 rounded ${
              activeTab === tab ? "bg-accent text-primary font-bold" : "bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="border-t pt-2 text-sm">
        {activeTab === "Game" && <p>Next match info, morale, budget.</p>}
        {activeTab === "Player" && <p>Player stats, renew contract.</p>}
        {activeTab === "Formation" && <p>Choose formation, proceed to matchday.</p>}
        {activeTab === "Opponent" && <p>Opponent info.</p>}
        {activeTab === "Finances" && <p>Balance, salaries, ticket prices.</p>}
        {activeTab === "Sell" && <p>Set minimum price and sell player.</p>}
        {activeTab === "Renew" && <p>Propose new contract for player.</p>}
      </div>
    </div>
  );
}
