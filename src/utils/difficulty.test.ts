import { describe, expect, it } from 'vitest';
import { starMultiplier, wrongMeansNewRound, difficultyForAge } from './difficulty';

describe('starMultiplier', () => {
  it('scales 1 / 3 / 5 by difficulty', () => {
    expect(starMultiplier('easy')).toBe(1);
    expect(starMultiplier('medium')).toBe(3);
    expect(starMultiplier('hard')).toBe(5);
  });
});

describe('wrongMeansNewRound', () => {
  it('only skips to a new question on hard or in a challenge', () => {
    expect(wrongMeansNewRound('easy')).toBe(false);
    expect(wrongMeansNewRound('medium')).toBe(false);
    expect(wrongMeansNewRound('hard')).toBe(true);
    expect(wrongMeansNewRound('easy', true)).toBe(true);
  });
});

describe('difficultyForAge', () => {
  it('Kita starts easy with hard locked; school starts medium with easy locked', () => {
    expect(difficultyForAge('little')).toEqual({ start: 'easy', locked: 'hard' });
    expect(difficultyForAge('big')).toEqual({ start: 'medium', locked: 'easy' });
  });
});
