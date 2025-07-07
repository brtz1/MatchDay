export interface Player {
  id: number;
  name: string;
  position: "GK" | "DF" | "MF" | "AT";
  rating: number;
  salary: number;
  nationality: string;
  underContract: boolean;
}
