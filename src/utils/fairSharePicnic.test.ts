import { describe, expect, it } from 'vitest';
import { generateRound } from './fairSharePicnic';
import type { GameDifficulty } from '../types/game';

describe('generateRound', () => {
  it('produces even splits except intentional hard leftovers', () => {
    const samples: Record<GameDifficulty, number> = { easy: 30, medium: 30, hard: 50 };
    for (const [difficulty, count] of Object.entries(samples) as [GameDifficulty, number][]) {
      for (let i = 0; i < count; i++) {
        const round = generateRound(difficulty);
        expect(round.totalSnacks).toBe(round.friends * round.perFriend + round.leftoverCount);
        expect(round.perFriend).toBeGreaterThan(0);

        if (difficulty === 'easy') {
          expect(round.friends).toBe(2);
          expect(round.hasLeftover).toBe(false);
          expect(round.leftoverCount).toBe(0);
          expect(round.totalSnacks).toBeGreaterThanOrEqual(2);
          expect(round.totalSnacks).toBeLessThanOrEqual(6);
        }

        if (difficulty === 'medium') {
          expect(round.friends).toBeGreaterThanOrEqual(2);
          expect(round.friends).toBeLessThanOrEqual(3);
          expect(round.hasLeftover).toBe(false);
          expect(round.totalSnacks).toBeLessThanOrEqual(12);
        }

        if (difficulty === 'hard') {
          expect(round.friends).toBe(3);
          expect(round.totalSnacks).toBeLessThanOrEqual(18);
          if (round.hasLeftover) {
            expect(round.leftoverCount).toBeGreaterThan(0);
            expect(round.leftoverCount).toBeLessThan(round.friends);
          } else {
            expect(round.leftoverCount).toBe(0);
          }
        }
      }
    }
  });
});
