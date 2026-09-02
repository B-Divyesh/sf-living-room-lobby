import { describe, expect, it } from 'vitest';
import { games, nextPrompt, playerCountError } from './game-data';

describe('game catalogue', () => {
  it('keeps all three core games free', () => {
    expect(games.slice(0, 3).every((game) => !game.paid)).toBe(true);
  });

  it('keeps the displayed player limits exact', () => {
    expect(games.map(({ id, minPlayers, maxPlayers, players }) => ({ id, minPlayers, maxPlayers, players }))).toEqual([
      { id: 'draw', minPlayers: 2, maxPlayers: 10, players: '2–10 players' },
      { id: 'point', minPlayers: 2, maxPlayers: 10, players: '2–10 players' },
      { id: 'pass', minPlayers: 3, maxPlayers: 12, players: '3–12 players' },
      { id: 'statue', minPlayers: 3, maxPlayers: 12, players: '3–12 players' },
      { id: 'chorus', minPlayers: 2, maxPlayers: 10, players: '2–10 players' },
    ]);
  });

  it('cycles prompts without falling off the list', () => {
    expect(nextPrompt('draw', 8)).toBe(nextPrompt('draw', 0));
  });

  it('accepts both advertised boundaries and explains either rejected side', () => {
    for (const game of games) {
      expect(playerCountError(game, game.minPlayers)).toBe('');
      expect(playerCountError(game, game.maxPlayers)).toBe('');
      expect(playerCountError(game, game.minPlayers - 1)).toContain(`Ask 1 more player to join`);
      expect(playerCountError(game, game.maxPlayers + 1)).toContain(`Ask 1 player to sit out this round`);
    }
  });
});
