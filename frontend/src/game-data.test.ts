import { describe, expect, it } from 'vitest';
import { games, nextPrompt } from './game-data';

describe('game catalogue', () => {
  it('keeps all three core games free', () => {
    expect(games.slice(0, 3).every((game) => !game.paid)).toBe(true);
  });

  it('cycles prompts without falling off the list', () => {
    expect(nextPrompt('draw', 8)).toBe(nextPrompt('draw', 0));
  });
});
