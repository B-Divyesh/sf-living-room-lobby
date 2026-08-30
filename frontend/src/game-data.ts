import type { GameId } from './types';

export interface GameInfo {
  id: GameId;
  icon: string;
  name: string;
  strap: string;
  minPlayers: number;
  maxPlayers: number;
  players: string;
  paid?: boolean;
}

function game(
  id: GameId,
  icon: string,
  name: string,
  strap: string,
  minPlayers: number,
  maxPlayers: number,
  paid = false,
): GameInfo {
  return {
    id,
    icon,
    name,
    strap,
    minPlayers,
    maxPlayers,
    players: `${minPlayers}–${maxPlayers} players`,
    paid,
  };
}

export const games: GameInfo[] = [
  game('draw', '✎', 'Draw together', 'One picture. Every hand.', 2, 10),
  game('point', '◎', 'Point panic', 'Aim your phone. Hit the shape.', 2, 10),
  game('pass', '↻', 'Pass & guess', 'One phone. Everyone plays.', 3, 12),
  game('statue', '◇', 'Statue switch', 'Freeze in the shape on screen.', 3, 12, true),
  game('chorus', '≋', 'Colour chorus', 'Match the rhythm together.', 2, 10, true),
];

export const drawPrompts = ['CAT', 'TREE', 'BOAT', 'SUN', 'FISH', 'HOUSE', 'BIRD', 'CAKE'];
export const passPrompts = ['🐘 ELEPHANT', '🚲 BICYCLE', '🌧️ RAIN', '🍌 BANANA', '✈️ AIRPLANE', '🐙 OCTOPUS', '🎂 BIRTHDAY', '🌋 VOLCANO'];
export const statuePrompts = ['TALL TRIANGLE △', 'TINY BALL ●', 'WIDE STAR ★', 'WAVY LINE ∿'];

export function nextPrompt(game: GameId, round = 0): string {
  const list = game === 'draw' ? drawPrompts : game === 'pass' ? passPrompts : game === 'statue' ? statuePrompts : ['READY'];
  return list[round % list.length];
}
