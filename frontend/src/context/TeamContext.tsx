// src/context/TeamContext.tsx
import { createContext, useContext, useState } from "react";
import { Player } from "../types";

interface TeamContextType {
  selectedPlayer: Player | null;
  setSelectedPlayer: (player: Player | null) => void;
  sellMode: boolean;
  setSellMode: (value: boolean) => void;
  renewMode: boolean;
  setRenewMode: (value: boolean) => void;

  currentTeamId: number | null;
  setCurrentTeamId: (id: number) => void;

  saveGameId: number | null;
  setSaveGameId: (id: number) => void;
}

const TeamContext = createContext<TeamContextType>({
  selectedPlayer: null,
  setSelectedPlayer: () => {},
  sellMode: false,
  setSellMode: () => {},
  renewMode: false,
  setRenewMode: () => {},
  currentTeamId: null,
  setCurrentTeamId: () => {},
  saveGameId: null,
  setSaveGameId: () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sellMode, setSellMode] = useState(false);
  const [renewMode, setRenewMode] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);
  const [saveGameId, setSaveGameId] = useState<number | null>(null);

  return (
    <TeamContext.Provider
      value={{
        selectedPlayer,
        setSelectedPlayer,
        sellMode,
        setSellMode,
        renewMode,
        setRenewMode,
        currentTeamId,
        setCurrentTeamId,
        saveGameId,
        setSaveGameId,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export const useTeamContext = () => useContext(TeamContext);
