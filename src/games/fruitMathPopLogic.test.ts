import { describe, expect, it } from 'vitest';
import { generateFruitMathRound } from './fruitMathPopLogic';
import type { GameDifficulty } from '../types/game';

const DIFFICULTIES: GameDifficulty[] = ['easy', 'medium', 'hard'];

describe('generateFruitMathRound', () => {
  it('always includes the result, stays in range, and never goes negative', () => {
    for (const difficulty of DIFFICULTIES) {
      const choiceCount = difficulty === 'easy' ? 2 : 3;
      const max = difficulty === 'hard' ? 10 : 5;
      for (let i = 0; i < 40; i++) {
        const round = generateFruitMathRound(difficulty);
        expect(round.choices).toHaveLength(choiceCount);
        expect(new Set(round.choices).size).toBe(choiceCount);
        expect(round.choices).toContain(round.result);
        expect(round.choices.every((n) => n >= 1 && n <= max)).toBe(true);
        if (round.operation === '+') {
          expect(round.left + round.right).toBe(round.result);
        } else {
          expect(round.left - round.right).toBe(round.result);
          expect(round.result).toBeGreaterThan(0);
        }
      }
    }
  });
});
