export interface BlindLevel {
  id: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
}

export interface Player {
  id: number;
  name: string;
}
