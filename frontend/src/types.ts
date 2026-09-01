export type GameId = 'draw' | 'point' | 'pass' | 'statue' | 'chorus';
export type Stage = 'lobby' | 'playing' | 'results';
export type RoomLanguage = 'en' | 'es' | 'picture';

export interface Player {
  id: string;
  name: string;
  mode: 'solo' | 'shared';
  color: string;
  score: number;
  x: number;
  y: number;
}

export interface StrokePoint {
  x: number;
  y: number;
  color: string;
  start: boolean;
}

export interface Room {
  code: string;
  revision: number;
  stage: Stage;
  game: GameId | null;
  prompt: string;
  language: RoomLanguage;
  round: number;
  players: Player[];
  drawing: StrokePoint[];
  targetX: number;
  targetY: number;
  message: string;
}

export interface Session {
  role: 'host' | 'player';
  code: string;
  token: string;
  playerId?: string;
  name?: string;
  mode?: 'solo' | 'shared';
}
