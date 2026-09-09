export type Cell = Readonly<{ x: number; y: number; z: number }>;
export type Direction = 'north' | 'east' | 'south' | 'west' | 'up' | 'down';
export type Level = Readonly<{
  id: number;
  name: string;
  sector: string;
  description: string;
  path: readonly Cell[];
  gems: readonly number[];
  lifts: readonly Readonly<{ from: number; to: number }>[];
}>;
export type GameStatus = 'playing' | 'paused' | 'falling' | 'won';
export type GameState = {
  position: Cell;
  moves: number;
  collected: number[];
  visited: number[];
  furthest: number;
  status: GameStatus;
};
