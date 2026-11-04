import { describe, expect, it } from 'vitest';
import { APP_THEMES } from '../theme/appTheme';
import { MEMORY_POOLS } from './memoryMatchPools';

describe('MEMORY_POOLS', () => {
  it('has at least 8 distinct faces for every app theme (hard = 8 pairs)', () => {
    for (const id of APP_THEMES) {
      expect(new Set(MEMORY_POOLS[id]).size).toBe(MEMORY_POOLS[id].length);
      expect(MEMORY_POOLS[id].length).toBeGreaterThanOrEqual(8);
    }
  });
});
