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
  game('draw', '✎', 'Draw Together', 'Everyone draws on one shared TV picture.', 2, 10),
  game('point', '◎', 'Point Panic', 'Aim your phone. Hit the shape.', 2, 10),
  game('pass', '↻', 'Pass & Guess', 'One phone. Everyone plays.', 3, 12),
  game('statue', '◇', 'Statue Switch', 'Freeze in the shape on screen.', 3, 12, true),
  game('chorus', '≋', 'Colour Chorus', 'Match the rhythm together.', 2, 10, true),
];

export function playerCountError(game: GameInfo, count: number): string {
  if (count < game.minPlayers) {
    const missing = game.minPlayers - count;
    return `${game.name} needs ${game.players}. Ask ${missing} more ${missing === 1 ? 'player' : 'players'} to join.`;
  }
  if (count > game.maxPlayers) {
    const extra = count - game.maxPlayers;
    return `${game.name} needs ${game.players}. Ask ${extra} ${extra === 1 ? 'player' : 'players'} to sit out this round.`;
  }
  return '';
}

export const drawPrompts = ['🐈 CAT', '🌳 TREE', '⛵ BOAT', '☀️ SUN', '🐟 FISH', '🏠 HOUSE', '🐦 BIRD', '🎂 BIRTHDAY CAKE'];
export const passPrompts = ['🐘 ELEPHANT', '🚲 BICYCLE', '🌧️ RAIN', '🍌 BANANA', '✈️ AIRPLANE', '🐙 OCTOPUS', '🎂 BIRTHDAY', '🌋 VOLCANO'];
export const statuePrompts = ['TALL TRIANGLE △', 'TINY BALL ●', 'WIDE STAR ★', 'WAVY LINE ∿'];

const spanishPrompts: Record<string, string> = {
  '🐈 CAT': '🐈 GATO', '🌳 TREE': '🌳 ÁRBOL', '⛵ BOAT': '⛵ BARCO', '☀️ SUN': '☀️ SOL',
  '🐟 FISH': '🐟 PEZ', '🏠 HOUSE': '🏠 CASA', '🐦 BIRD': '🐦 PÁJARO', '🎂 BIRTHDAY CAKE': '🎂 PASTEL',
  '🐘 ELEPHANT': '🐘 ELEFANTE', '🚲 BICYCLE': '🚲 BICICLETA', '🌧️ RAIN': '🌧️ LLUVIA',
  '🍌 BANANA': '🍌 PLÁTANO', '✈️ AIRPLANE': '✈️ AVIÓN', '🐙 OCTOPUS': '🐙 PULPO',
  '🎂 BIRTHDAY': '🎂 CUMPLEAÑOS', '🌋 VOLCANO': '🌋 VOLCÁN',
};

export function localizedPrompt(prompt: string, language: 'en' | 'es' | 'picture'): string {
  if (language === 'picture') return prompt.split(' ')[0];
  return language === 'es' ? (spanishPrompts[prompt] || prompt) : prompt;
}

export function nextPrompt(game: GameId, round = 0): string {
  const list = game === 'draw' ? drawPrompts : game === 'pass' ? passPrompts : game === 'statue' ? statuePrompts : ['READY'];
  return list[round % list.length];
}
