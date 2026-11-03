import { describe, expect, it } from 'vitest';
import { MATH_POP_MAX, generateMathQuestion, type MathQuestion } from './mathPopLogic';
import { seededRand } from '../utils/random';
import type { AgeBand, GameDifficulty } from '../types/game';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];
const BANDS: AgeBand[] = ['little', 'big'];
const SEEDS = 4000;

function sample(band: AgeBand, level: GameDifficulty, n = SEEDS): MathQuestion[] {
  return Array.from({ length: n }, (_, seed) => generateMathQuestion(level, band, seededRand(seed + 1)));
}

function share(qs: MathQuestion[], ops: string[]) {
  return qs.filter((q) => ops.includes(q.operator)).length / qs.length;
}

describe('generateMathQuestion: every band and level', () => {
  for (const band of BANDS) {
    for (const level of LEVELS) {
      it(`${band} ${level}: right answer, never negative, three unique near options`, () => {
        const max = MATH_POP_MAX[band][level];
        for (const q of sample(band, level)) {
          const expected = { '+': q.num1 + q.num2, '-': q.num1 - q.num2, '×': q.num1 * q.num2, '÷': q.num1 / q.num2 }[q.operator];
          expect(q.answer).toBe(expected);
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThan(0);
          expect(q.answer).toBeLessThanOrEqual(max);
          expect(Math.min(q.num1, q.num2)).toBeGreaterThan(0);
          expect(q.options).toHaveLength(3);
          expect(new Set(q.options).size).toBe(3);
          expect(q.options).toContain(q.answer);
          for (const n of q.options) {
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(max);
            expect(Math.abs(n - q.answer)).toBeLessThanOrEqual(3);
          }
        }
      });
    }
  }

  it('defaults to preschool when no band is given (old call shape)', () => {
    for (let i = 0; i < 200; i++) expect(generateMathQuestion('easy').answer).toBeLessThanOrEqual(8);
  });
});

describe('preschool ladder', () => {
  it('easy only adds, sum <= 8', () => {
    for (const q of sample('little', 'easy')) {
      expect(q.operator).toBe('+');
      expect(q.answer).toBeLessThanOrEqual(8);
    }
  });

  it('medium only adds, sum <= 10', () => {
    for (const q of sample('little', 'medium')) {
      expect(q.operator).toBe('+');
      expect(q.answer).toBeLessThanOrEqual(10);
    }
  });

  it('hard adds to 20 and takes away only within 10', () => {
    const qs = sample('little', 'hard');
    for (const q of qs) {
      expect(['+', '-']).toContain(q.operator);
      if (q.operator === '+') expect(q.answer).toBeLessThanOrEqual(20);
      else expect(q.num1).toBeLessThanOrEqual(10);
    }
    expect(share(qs, ['-'])).toBeGreaterThan(0.4);
    expect(qs.some((q) => q.answer > 10)).toBe(true);
  });
});

describe('school ladder', () => {
  it('easy adds and takes away within 20', () => {
    const qs = sample('big', 'easy');
    for (const q of qs) {
      expect(['+', '-']).toContain(q.operator);
      expect(Math.max(q.num1, q.num2, q.answer)).toBeLessThanOrEqual(20);
    }
    expect(share(qs, ['-'])).toBeGreaterThan(0.4);
  });

  it('medium: +/- within 50 without crossing a ten, about 1 in 4 is 1-5 times tables', () => {
    const qs = sample('big', 'medium');
    for (const q of qs) {
      expect(['+', '-', '×']).toContain(q.operator);
      if (q.operator === '×') {
        expect(q.num1).toBeLessThanOrEqual(5);
        expect(q.num2).toBeLessThanOrEqual(5);
        expect(q.answer).toBeLessThanOrEqual(25);
      } else {
        expect(Math.max(q.num1, q.num2, q.answer)).toBeLessThanOrEqual(50);
        if (q.operator === '+') expect((q.num1 % 10) + (q.num2 % 10)).toBeLessThanOrEqual(9);
        else expect(q.num1 % 10).toBeGreaterThanOrEqual(q.num2 % 10);
      }
    }
    const times = share(qs, ['×']);
    expect(times).toBeGreaterThan(0.21);
    expect(times).toBeLessThan(0.29);
    expect(qs.some((q) => q.operator !== '×' && q.num1 > 20)).toBe(true);
  });

  it('hard: +/- within 100 with carrying, 1-10 times tables, whole division by 2, 5, 10', () => {
    const qs = sample('big', 'hard');
    for (const q of qs) {
      if (q.operator === '×') {
        expect(Math.max(q.num1, q.num2)).toBeLessThanOrEqual(10);
      } else if (q.operator === '÷') {
        expect([2, 5, 10]).toContain(q.num2);
        expect(q.num1 % q.num2).toBe(0);
        expect(q.answer).toBeGreaterThanOrEqual(1);
        expect(q.answer).toBeLessThanOrEqual(10);
      } else {
        expect(Math.max(q.num1, q.num2, q.answer)).toBeLessThanOrEqual(100);
      }
    }
    expect(qs.some((q) => q.operator === '+' && (q.num1 % 10) + (q.num2 % 10) > 9)).toBe(true);
    expect(qs.some((q) => q.operator === '-' && q.num1 % 10 < q.num2 % 10)).toBe(true);
    const plusMinus = share(qs, ['+', '-']);
    const times = share(qs, ['×']);
    const divide = share(qs, ['÷']);
    expect(plusMinus).toBeGreaterThan(0.46);
    expect(plusMinus).toBeLessThan(0.54);
    expect(times).toBeGreaterThan(0.26);
    expect(times).toBeLessThan(0.34);
    expect(divide).toBeGreaterThan(0.16);
    expect(divide).toBeLessThan(0.24);
  });
});
