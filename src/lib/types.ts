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
  rebuys: number;
  addons: number;
}

export interface RoundWinner {
  round: number;
  winnerName: string;
}

// Tipos para Cash Game
export interface CashGameChip {
    id: number;
    value: number;
    color: string;
    name: string;
}

export interface CashGamePlayer {
    id: number;
    name: string;
    buyIn: number; // Valor total de buy-in do jogador
    chipCount: { chipId: number; count: number }[]; // A contagem de fichas que o jogador possui
    finalCashOut?: number; // Valor final ao sair da mesa
}
