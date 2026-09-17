import { describe, expect, it } from 'vitest';
import { starMultiplier } from './difficulty';

describe('starMultiplier', () => {
  it('scales 1 / 3 / 5 by difficulty', () => {
    expect(starMultiplier('easy')).toBe(1);
    expect(starMultiplier('medium')).toBe(3);
    expect(starMultiplier('hard')).toBe(5);
  });
});
