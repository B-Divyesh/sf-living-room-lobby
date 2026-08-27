import type { GameId } from './types';

export interface GameInfo {
  id: GameId;
  icon: string;
  name: string;
  strap: string;
  players: string;
  paid?: boolean;
}

export const games: GameInfo[] = [
  { id: 'draw', icon: '✎', name: 'Draw together', strap: 'One picture. Every hand.', players: '2–10 players' },
  { id: 'point', icon: '◎', name: 'Point panic', strap: 'Aim your phone. Hit the shape.', players: '2–10 players' },
  { id: 'pass', icon: '↻', name: 'Pass & guess', strap: 'One phone. Everyone plays.', players: '3–12 players' },
  { id: 'statue', icon: '◇', name: 'Statue switch', strap: 'Freeze in the shape on screen.', players: '3–12 players', paid: true },
  { id: 'chorus', icon: '≋', name: 'Colour chorus', strap: 'Match the rhythm together.', players: '2–10 players', paid: true },
];

export const drawPrompts = ['CAT', 'TREE', 'BOAT', 'SUN', 'FISH', 'HOUSE', 'BIRD', 'CAKE'];
export const passPrompts = ['🐘 ELEPHANT', '🚲 BICYCLE', '🌧️ RAIN', '🍌 BANANA', '✈️ AIRPLANE', '🐙 OCTOPUS', '🎂 BIRTHDAY', '🌋 VOLCANO'];
export const statuePrompts = ['TALL TRIANGLE △', 'TINY BALL ●', 'WIDE STAR ★', 'WAVY LINE ∿'];

export function nextPrompt(game: GameId, round = 0): string {
  const list = game === 'draw' ? drawPrompts : game === 'pass' ? passPrompts : game === 'statue' ? statuePrompts : ['READY'];
  return list[round % list.length];
}
