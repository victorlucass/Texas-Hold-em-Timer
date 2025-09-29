export interface BlindLevel {
  id: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
}

export interface Player {
  id: number;
  name: string;
  balance: number;
  rebuys: number; // This will now store the total monetary value of rebuys
  addons: number; // This will store the total monetary value of add-ons
}

export interface RoundWinner {
  round: number;
  winnerName: string;
}
