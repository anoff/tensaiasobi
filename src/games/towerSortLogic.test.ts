import { describe, expect, it } from 'vitest';
import { canDrop, generateTowers, isSolved, TOWER_SORT_CONFIG } from './towerSortLogic';
import { TOWER_SORT_THEMES } from './towerSortThemes';
import type { GameDifficulty } from '../types/game';

describe('Tower Sort board', () => {
  it('keeps ≤ 5 tubes and a height cap of 4 on every difficulty', () => {
    for (const config of Object.values(TOWER_SORT_CONFIG)) {
      expect(config.towers).toBeLessThanOrEqual(5);
      expect(config.height).toBeLessThanOrEqual(4);
      expect(config.towers).toBeGreaterThan(config.types);
    }
  });

  it('generates a scrambled board that respects capacity and keeps every piece', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as GameDifficulty[]) {
      const config = TOWER_SORT_CONFIG[difficulty];
      for (let i = 0; i < 50; i++) {
        const towers = generateTowers(difficulty, TOWER_SORT_THEMES[i % TOWER_SORT_THEMES.length]);
        expect(towers).toHaveLength(config.towers);
        expect(towers.every((tower) => tower.length <= config.height)).toBe(true);
        expect(towers.flat()).toHaveLength(config.types * config.height);
        expect(isSolved(towers)).toBe(false);
      }
    }
  });

  it('refuses to drop onto a full tube', () => {
    const towers = [['🐶', '🐶', '🐶'], ['🐱'], []];
    expect(canDrop(towers, 0, 3)).toBe(false);
    expect(canDrop(towers, 1, 3)).toBe(true);
    expect(canDrop(towers, 2, 3)).toBe(true);
  });
});
