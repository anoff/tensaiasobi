import { describe, expect, it } from 'vitest';
import { MATH_POP_MAX, generateMathQuestion } from './mathPopLogic';
import type { GameDifficulty } from '../types/game';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];

describe('generateMathQuestion', () => {
  it('stays inside the level range with three distinct options including the answer', () => {
    for (const level of LEVELS) {
      const max = MATH_POP_MAX[level];
      for (let i = 0; i < 300; i++) {
        const q = generateMathQuestion(level);
        expect(q.answer).toBe(q.operator === '+' ? q.num1 + q.num2 : q.num1 - q.num2);
        expect(q.answer).toBeGreaterThan(0);
        expect(q.answer).toBeLessThanOrEqual(max);
        expect(Math.max(q.num1, q.num2)).toBeLessThanOrEqual(max);
        expect(q.options).toHaveLength(3);
        expect(new Set(q.options).size).toBe(3);
        expect(q.options).toContain(q.answer);
        expect(q.options.every((n) => n >= 0 && n <= max)).toBe(true);
      }
    }
  });

  it('only adds on easy', () => {
    for (let i = 0; i < 100; i++) expect(generateMathQuestion('easy').operator).toBe('+');
  });

  it('keeps hard about bridging ten', () => {
    for (let i = 0; i < 300; i++) {
      const q = generateMathQuestion('hard');
      if (q.operator === '+') expect(q.answer).toBeGreaterThan(10);
      else expect(q.num1).toBeGreaterThan(10);
    }
  });
});
