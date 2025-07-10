export type GameStage = 'ACTION' | 'MATCHDAY' | 'HALFTIME' | 'RESULTS' | 'STANDINGS';
export type MatchdayType = 'LEAGUE' | 'CUP';

export interface GameState {
  id: number;
  currentSaveGameId: number;
  coachTeamId: number;
  gameStage: GameStage;
  matchdayType: MatchdayType;
  currentMatchday: number;
  // optionally: coachTeam?: Team, saveGame?: SaveGame;
}
