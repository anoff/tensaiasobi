import { describe, expect, it } from 'vitest';
import type { GameDifficulty } from '../types/game';
import { seededRand } from '../utils/random';
import { starMultiplier } from '../utils/difficulty';
import {
  COMMON_FLOATS, COMMON_SINKS, OBJECT_COUNTS, OBVIOUS_FLOATS, OBVIOUS_SINKS, SURPRISING, SURPRISING_FLOATS, SURPRISING_SINKS,
  afterWrong, allPredicted, flowFor, generateSinkFloatRound, isCorrectPrediction, resolveBatch, sinkFloatRoundKey, sinkFloatStars, trueResult,
  type Prediction,
} from './sinkOrFloatLogic';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];
const RUNS = 300;

describe('Sink or Float pools', () => {
  it('has no emoji in two pools and no object on the wrong side', () => {
    const all = [...OBVIOUS_FLOATS, ...OBVIOUS_SINKS, ...COMMON_FLOATS, ...COMMON_SINKS, ...SURPRISING_FLOATS, ...SURPRISING_SINKS];
    expect(new Set(all.map((o) => o.emoji)).size).toBe(all.length);
    for (const o of [...OBVIOUS_FLOATS, ...COMMON_FLOATS, ...SURPRISING_FLOATS]) expect(o.floats).toBe(true);
    for (const o of [...OBVIOUS_SINKS, ...COMMON_SINKS, ...SURPRISING_SINKS]) expect(o.floats).toBe(false);
  });
});

describe('generateSinkFloatRound', () => {
  it('uses the object count of each level, with no duplicates', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < RUNS; i++) {
        const { objects } = generateSinkFloatRound(level, seededRand(i));
        expect(OBJECT_COUNTS[level]).toContain(objects.length);
        expect(new Set(objects.map((o) => o.emoji)).size).toBe(objects.length);
      }
    }
  });

  it('always has at least one floater and one sinker', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < RUNS; i++) {
        const { objects } = generateSinkFloatRound(level, seededRand(i));
        expect(objects.some((o) => o.floats)).toBe(true);
        expect(objects.some((o) => !o.floats)).toBe(true);
      }
    }
  });

  it('easy is two obvious objects and never surprising', () => {
    for (let i = 0; i < RUNS; i++) {
      const { objects } = generateSinkFloatRound('easy', seededRand(i));
      expect(objects).toHaveLength(2);
      for (const o of objects) {
        expect([...OBVIOUS_FLOATS, ...OBVIOUS_SINKS].some((p) => p.emoji === o.emoji)).toBe(true);
      }
    }
  });

  it('surprising objects only appear on hard, and hard always has two', () => {
    for (const level of ['easy', 'medium'] as const) {
      for (let i = 0; i < RUNS; i++) {
        const { objects } = generateSinkFloatRound(level, seededRand(i));
        expect(objects.some((o) => SURPRISING.has(o.emoji))).toBe(false);
      }
    }
    for (let i = 0; i < RUNS; i++) {
      const { objects } = generateSinkFloatRound('hard', seededRand(i));
      expect(objects.filter((o) => SURPRISING.has(o.emoji)).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('is reproducible with a seed and varies between seeds', () => {
    expect(generateSinkFloatRound('hard', seededRand(7))).toEqual(generateSinkFloatRound('hard', seededRand(7)));
    const keys = new Set(Array.from({ length: 50 }, (_, i) => sinkFloatRoundKey(generateSinkFloatRound('medium', seededRand(i)))));
    expect(keys.size).toBeGreaterThan(10);
  });

  it('round key ignores shelf order', () => {
    const a = { objects: [{ emoji: '🪨', floats: false }, { emoji: '🦆', floats: true }] };
    const b = { objects: [a.objects[1], a.objects[0]] };
    expect(sinkFloatRoundKey(a)).toBe(sinkFloatRoundKey(b));
  });
});

describe('predictions', () => {
  const duck = { emoji: '🦆', floats: true };
  const rock = { emoji: '🪨', floats: false };

  it('checks a prediction against the true result', () => {
    expect(isCorrectPrediction(duck, 'float')).toBe(true);
    expect(isCorrectPrediction(duck, 'sink')).toBe(false);
    expect(isCorrectPrediction(rock, 'sink')).toBe(true);
    expect(isCorrectPrediction(rock, 'float')).toBe(false);
    expect(trueResult(duck)).toBe('float');
    expect(trueResult(rock)).toBe('sink');
  });

  it('batch rounds need every object predicted before the drop', () => {
    const round = { objects: [duck, rock] };
    expect(allPredicted(round, {})).toBe(false);
    expect(allPredicted(round, { '🦆': 'float' })).toBe(false);
    expect(allPredicted(round, { '🦆': 'float', '🪨': 'float' })).toBe(true);
  });

  it('resolves a batch with the true result of every object, right or wrong', () => {
    const round = { objects: [duck, rock] };
    const predictions: Record<string, Prediction> = { '🦆': 'float', '🪨': 'float' };
    expect(resolveBatch(round, predictions)).toEqual([
      { emoji: '🦆', result: 'float', correct: true },
      { emoji: '🪨', result: 'sink', correct: false },
    ]);
  });
});

describe('flow, stars and wrong answers', () => {
  it('easy is one at a time, medium free order, hard predicts all first', () => {
    expect(flowFor('easy')).toBe('single');
    expect(flowFor('medium')).toBe('free');
    expect(flowFor('hard')).toBe('batch');
  });

  it('pays 2 x starMultiplier per finished round: 2 / 6 / 10', () => {
    expect(LEVELS.map(sinkFloatStars)).toEqual([2, 6, 10]);
    for (const level of LEVELS) expect(sinkFloatStars(level)).toBe(2 * starMultiplier(level));
  });

  it('retries on easy/medium and moves to a fresh round on hard or in challenges', () => {
    expect(afterWrong('easy')).toBe('retry');
    expect(afterWrong('medium')).toBe('retry');
    expect(afterWrong('hard')).toBe('fresh');
    expect(afterWrong('easy', true)).toBe('fresh');
    expect(afterWrong('medium', true)).toBe('fresh');
  });
});
