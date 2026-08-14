import { describe, test, expect } from 'vitest';
import {
  generateWaveRound,
  generateWaveFrame,
} from '../src/games/waveSurferLogic';
import type { GameDifficulty } from '../src/types/game';

describe('Wave Surfer logic', () => {
  test('every generated round has exactly one correct option', () => {
    const difficulties: GameDifficulty[] = ['easy', 'medium', 'hard'];
    for (const difficulty of difficulties) {
      for (let i = 0; i < 50; i++) {
        const round = generateWaveRound(difficulty);
        expect(round.challenge.options).toHaveLength(3);
        const correctCount = round.challenge.options.filter((opt) => opt === round.challenge.answer).length;
        expect(correctCount).toBe(1);
      }
    }
  });

  test('easy math uses only small addition', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('easy');
      expect(round.challenge.type).toBe('math');
      const text = round.challenge.text;
      const match = text.match(/^(\d+) \+ (\d+) = \?$/);
      expect(match).not.toBeNull();
      const [, left, right] = match!;
      const l = Number(left);
      const r = Number(right);
      expect(l).toBeGreaterThanOrEqual(1);
      expect(l).toBeLessThanOrEqual(5);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(4);
      expect(round.challenge.answer).toBe(l + r);
    }
  });

  test('medium math uses single-digit numbers with + or -', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('medium');
      expect(round.challenge.type).toBe('math');
      const text = round.challenge.text;
      const match = text.match(/^(\d+) ([-+]) (\d+) = \?$/);
      expect(match).not.toBeNull();
      const [, left, op, right] = match!;
      const l = Number(left);
      const r = Number(right);
      expect(l).toBeGreaterThanOrEqual(1);
      expect(l).toBeLessThanOrEqual(9);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(9);
      if (op === '-') {
        expect(l).toBeGreaterThanOrEqual(r);
      }
    }
  });

  test('hard math uses numbers up to 50 with + or -', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('hard');
      expect(round.challenge.type).toBe('math');
      const text = round.challenge.text;
      const match = text.match(/^(\d+) ([-+]) (\d+) = \?$/);
      expect(match).not.toBeNull();
      const [, left, op, right] = match!;
      const l = Number(left);
      const r = Number(right);
      expect(l).toBeGreaterThanOrEqual(10);
      expect(l).toBeLessThanOrEqual(50);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(50);
      if (op === '-') {
        expect(l).toBeGreaterThanOrEqual(r);
      }
      expect(round.challenge.answer).toBeLessThanOrEqual(50);
    }
  });

  test('obstacle placement always leaves at least one clear lane', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as GameDifficulty[]) {
      for (let i = 0; i < 50; i++) {
        const frame = generateWaveFrame(difficulty, 400);
        const blockedLanes = new Set(frame.obstacles.map((o) => o.lane));
        expect(blockedLanes.size).toBeLessThan(3);
        if (difficulty !== 'easy') {
          expect(frame.obstacles).toHaveLength(1);
        }
      }
    }
  });

});
