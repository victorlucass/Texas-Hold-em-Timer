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
}

export interface RoundWinner {
  round: number;
  winnerName: string;
}
