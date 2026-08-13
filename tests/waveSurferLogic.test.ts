import { describe, test, expect } from 'vitest';
import {
  generateWaveRound,
  generateWaveFrame,
  type WaveChallenge,
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

  test('math challenges for each difficulty fit stated rules', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('easy');
      if (round.challenge.type === 'math') {
        const text = round.challenge.text;
        const match = text.match(/^(\d+) ([+\-×]) (\d+) = \?$/);
        expect(match).not.toBeNull();
        const [, left, op, right] = match!;
        const l = Number(left);
        const r = Number(right);
        expect(l).toBeGreaterThanOrEqual(1);
        expect(r).toBeGreaterThanOrEqual(1);
        if (op === '+' || op === '-') {
          expect(l).toBeLessThanOrEqual(9);
          expect(r).toBeLessThanOrEqual(9);
        }
        if (op === '-') {
          expect(l).toBeGreaterThanOrEqual(r);
        }
      }
    }
  });

  test('medium math uses double-digit numbers under 50', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('medium');
      if (round.challenge.type === 'math') {
        const text = round.challenge.text;
        const match = text.match(/^(\d+) ([+\-×]) (\d+) = \?$/);
        expect(match).not.toBeNull();
        const [, left, op, right] = match!;
        const l = Number(left);
        const r = Number(right);
        expect(l).toBeGreaterThanOrEqual(10);
        expect(l).toBeLessThanOrEqual(50);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(20);
        expect(op).not.toBe('×');
      }
    }
  });

  test('hard math uses single-digit multiplication', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('hard');
      if (round.challenge.type === 'math') {
        const text = round.challenge.text;
        const match = text.match(/^(\d+) × (\d+) = \?$/);
        expect(match).not.toBeNull();
        const [, left, right] = match!;
        const l = Number(left);
        const r = Number(right);
        expect(l).toBeGreaterThanOrEqual(2);
        expect(l).toBeLessThanOrEqual(9);
        expect(r).toBeGreaterThanOrEqual(2);
        expect(r).toBeLessThanOrEqual(9);
        expect(round.challenge.answer).toBe(l * r);
      }
    }
  });

  test('obstacle placement always leaves at least one clear lane', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as GameDifficulty[]) {
      for (let i = 0; i < 50; i++) {
        const frame = generateWaveFrame(difficulty, 400);
        const blockedLanes = new Set(frame.obstacles.map((o) => o.lane));
        expect(blockedLanes.size).toBeLessThan(3);
      }
    }
  });

  test('spelling options are unique and contain the answer', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('medium');
      if (round.challenge.type === 'spelling') {
        expect(round.challenge.options).toContain(round.challenge.answer);
        expect(new Set(round.challenge.options).size).toBe(3);
      }
    }
  });

  test('hard spelling challenge shows a word emoji and asks for the full word', () => {
    for (let i = 0; i < 100; i++) {
      const round = generateWaveRound('hard');
      if (round.challenge.type === 'spelling') {
        const challenge = round.challenge as Extract<WaveChallenge, { type: 'spelling' }>;
        expect(challenge.promptEmoji).toBeTruthy();
        expect(challenge.text).toContain('Find:');
        expect(challenge.answer).toMatch(/^[a-z]+$/i);
      }
    }
  });
});
