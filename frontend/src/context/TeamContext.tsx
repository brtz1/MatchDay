import { createContext, useContext, useState } from "react";

interface Player {
  id: number;
  name: string;
  position: string;
  rating: number;
  salary: number;
  nationality: string;
}

interface TeamContextType {
  selectedPlayer: Player | null;
  setSelectedPlayer: (player: Player | null) => void;
  sellMode: boolean;
  setSellMode: (value: boolean) => void;
  renewMode: boolean;
  setRenewMode: (value: boolean) => void;
}

const TeamContext = createContext<TeamContextType>({
  selectedPlayer: null,
  setSelectedPlayer: () => {},
  sellMode: false,
  setSellMode: () => {},
  renewMode: false,
  setRenewMode: () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [sellMode, setSellMode] = useState(false);
  const [renewMode, setRenewMode] = useState(false);

  return (
    <TeamContext.Provider
      value={{ selectedPlayer, setSelectedPlayer, sellMode, setSellMode, renewMode, setRenewMode }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export const useTeamContext = () => useContext(TeamContext);
