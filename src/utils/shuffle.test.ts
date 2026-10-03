import { describe, expect, it } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('returns a new array with the same members', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = shuffle(input);
    expect(output).not.toBe(input);
    expect(output).toHaveLength(input.length);
    expect([...output].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('shuffle with a seed', () => {
  it('is reproducible', async () => {
    const { seededRand } = await import('./random');
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(input, seededRand(42))).toEqual(shuffle(input, seededRand(42)));
  });
});
