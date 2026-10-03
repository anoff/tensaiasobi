import { describe, expect, it } from 'vitest';
import { freshRound } from './freshRound';

describe('freshRound', () => {
  it('retries until the round differs from the previous one', () => {
    const queue = [1, 1, 1, 2];
    expect(freshRound(() => queue.shift()!, 1, String)).toBe(2);
  });

  it('gives up after a few tries instead of looping forever', () => {
    expect(freshRound(() => 1, 1, String, 3)).toBe(1);
  });
});
