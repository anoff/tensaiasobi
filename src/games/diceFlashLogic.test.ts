import { describe, expect, it } from 'vitest';
import type { GameDifficulty } from '../types/game';
import { seededRand } from '../utils/random';
import {
  DICE_CONFIG, DICE_STARS, FLASHES_PER_ROUND, REVEAL_FRESH_MS, REVEAL_RETRY_MS, SCATTER_GAP,
  answerOptions, dieFace, diceRoundKey, generateDiceRound, nextDiceRound, resolveAnswer, revealMs, scatterDots,
} from './diceFlashLogic';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];
const RUNS = 300;

describe('die faces', () => {
  it('has the right number of dots for 1-6, all inside the card and distinct', () => {
    for (let n = 1; n <= 6; n++) {
      const face = dieFace(n);
      expect(face).toHaveLength(n);
      expect(new Set(face.map((d) => `${d.x},${d.y}`)).size).toBe(n);
      for (const d of face) {
        expect(d.x).toBeGreaterThan(0);
        expect(d.x).toBeLessThan(100);
        expect(d.y).toBeGreaterThan(0);
        expect(d.y).toBeLessThan(100);
      }
    }
    expect(() => dieFace(7)).toThrow();
  });

  it('is a copy, so callers cannot change the face', () => {
    dieFace(3)[0].x = 99;
    expect(dieFace(3)[0].x).not.toBe(99);
  });
});

describe('scatterDots', () => {
  it('places exactly n dots on the card, none closer than the gap', () => {
    for (let n = 1; n <= 10; n++) {
      for (let i = 0; i < 50; i++) {
        const dots = scatterDots(n, seededRand(i * 31 + n));
        expect(dots).toHaveLength(n);
        for (const d of dots) {
          expect(d.x).toBeGreaterThanOrEqual(0);
          expect(d.x).toBeLessThanOrEqual(100);
          expect(d.y).toBeGreaterThanOrEqual(0);
          expect(d.y).toBeLessThanOrEqual(100);
        }
        for (let a = 0; a < dots.length; a++) {
          for (let b = a + 1; b < dots.length; b++) {
            expect(Math.hypot(dots[a].x - dots[b].x, dots[a].y - dots[b].y)).toBeGreaterThanOrEqual(SCATTER_GAP);
          }
        }
      }
    }
  });
});

describe('answerOptions', () => {
  it('has the right count exactly once, in range, ascending, with the tier option count', () => {
    for (const level of LEVELS) {
      const { min, max, optionCount } = DICE_CONFIG[level];
      for (let count = min; count <= max; count++) {
        for (let i = 0; i < 20; i++) {
          const options = answerOptions(count, level, seededRand(i));
          expect(options).toHaveLength(optionCount);
          expect(options.filter((o) => o === count)).toHaveLength(1);
          expect(new Set(options).size).toBe(optionCount);
          expect([...options].sort((a, b) => a - b)).toEqual(options);
          for (const o of options) {
            expect(o).toBeGreaterThanOrEqual(min);
            expect(o).toBeLessThanOrEqual(max);
          }
        }
      }
    }
  });

  it('easy offers every number from 1 to 3', () => {
    expect(answerOptions(2, 'easy')).toEqual([1, 2, 3]);
  });

  it('hard uses the nearest numbers as distractors', () => {
    for (let i = 0; i < 100; i++) {
      const options = answerOptions(5, 'hard', seededRand(i));
      for (const o of options) expect(Math.abs(o - 5)).toBeLessThanOrEqual(2);
    }
  });
});

describe('generateDiceRound', () => {
  it('matches the tier table: dot range, flash time, layout kind', () => {
    for (const level of LEVELS) {
      const { min, max, flashMs } = DICE_CONFIG[level];
      for (let i = 0; i < RUNS; i++) {
        const round = generateDiceRound(level, seededRand(i));
        expect(round.count).toBeGreaterThanOrEqual(min);
        expect(round.count).toBeLessThanOrEqual(max);
        expect(round.dots).toHaveLength(round.count);
        expect(round.flashMs).toBe(flashMs);
        expect(round.options).toContain(round.count);
      }
    }
    expect(DICE_CONFIG.easy.flashMs).toBe(2000);
    expect(DICE_CONFIG.medium.flashMs).toBe(1500);
    expect(DICE_CONFIG.hard.flashMs).toBe(1000);
  });

  it('easy and medium use standard die faces, hard scatters', () => {
    for (const level of ['easy', 'medium'] as const) {
      for (let i = 0; i < 50; i++) {
        const round = generateDiceRound(level, seededRand(i));
        expect(round.dots).toEqual(dieFace(round.count));
      }
    }
    const layouts = new Set(Array.from({ length: 30 }, (_, i) => diceRoundKey(generateDiceRound('hard', seededRand(i)))));
    expect(layouts.size).toBeGreaterThan(20);
  });

  it('covers every count in the range', () => {
    for (const level of LEVELS) {
      const seen = new Set<number>();
      for (let i = 0; i < RUNS; i++) seen.add(generateDiceRound(level, seededRand(i)).count);
      const { min, max } = DICE_CONFIG[level];
      expect(seen.size).toBe(max - min + 1);
    }
  });
});

describe('nextDiceRound', () => {
  it('never shows the same dot layout twice in a row', () => {
    for (const level of LEVELS) {
      let previous = nextDiceRound(level);
      for (let i = 0; i < RUNS; i++) {
        const next = nextDiceRound(level, previous);
        expect(diceRoundKey(next)).not.toBe(diceRoundKey(previous));
        previous = next;
      }
    }
  });
});

describe('stars and wrong answers', () => {
  it('pays flat CHOICE_STARS 2 / 3 / 4 per correct answer (decision 3A)', () => {
    expect(LEVELS.map((l) => DICE_STARS[l])).toEqual([2, 3, 4]);
    expect(FLASHES_PER_ROUND).toBe(5);
  });

  it('a right tap is correct on every level', () => {
    const round = generateDiceRound('easy', seededRand(1));
    for (const level of LEVELS) expect(resolveAnswer(round, round.count, level)).toBe('correct');
  });

  it('a miss replays the same flash on easy/medium, and moves on to a fresh one on hard or in challenges', () => {
    const round = { count: 3, dots: dieFace(3), options: [1, 2, 3], flashMs: 2000 };
    expect(resolveAnswer(round, 2, 'easy')).toBe('replay');
    expect(resolveAnswer(round, 2, 'medium')).toBe('replay');
    expect(resolveAnswer(round, 2, 'hard')).toBe('fresh');
    expect(resolveAnswer(round, 2, 'easy', true)).toBe('fresh');
    expect(resolveAnswer(round, 2, 'medium', true)).toBe('fresh');
  });

  it('keeps the dots visible for 3 s after a replay miss and shorter before a fresh flash', () => {
    expect(revealMs('easy')).toBe(REVEAL_RETRY_MS);
    expect(REVEAL_RETRY_MS).toBe(3000);
    expect(revealMs('hard')).toBe(REVEAL_FRESH_MS);
    expect(revealMs('medium', true)).toBe(REVEAL_FRESH_MS);
  });
});
