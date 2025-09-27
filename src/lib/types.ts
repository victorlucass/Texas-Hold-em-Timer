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
}

export interface RoundWinner {
  round: number;
  winnerName: string;
}
