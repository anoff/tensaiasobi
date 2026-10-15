import { describe, expect, it } from 'vitest';
import type { GameDifficulty } from '../types/game';
import { seededRand } from '../utils/random';
import { starMultiplier } from '../utils/difficulty';
import {
  ANIMALS, HINT_AFTER_MISSES, REPLAY_CONFIG, SIMON_CONFIG, extendSequence, freshSequence, generateSequence, hintAnimal, playbackDuration,
  playbackFor, press, simonStars, startRun, type SimonState,
} from './simonLogic';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];

const noTriples = (seq: readonly number[]) => seq.every((a, i) => i < 2 || !(a === seq[i - 1] && a === seq[i - 2]));

describe('tier table', () => {
  it('has 4 animals everywhere and the lengths and speeds of the issue', () => {
    expect(ANIMALS).toHaveLength(4);
    expect(new Set(ANIMALS).size).toBe(4);
    expect(LEVELS.map((l) => [SIMON_CONFIG[l].minLength, SIMON_CONFIG[l].maxLength])).toEqual([[2, 4], [3, 6], [4, 8]]);
    // Faster each tier; the replay is as slow as easy.
    expect(SIMON_CONFIG.easy.stepMs).toBeGreaterThan(SIMON_CONFIG.medium.stepMs);
    expect(SIMON_CONFIG.medium.stepMs).toBeGreaterThan(SIMON_CONFIG.hard.stepMs);
    expect(REPLAY_CONFIG.stepMs).toBe(SIMON_CONFIG.easy.stepMs);
    expect(playbackFor('hard', true)).toEqual(REPLAY_CONFIG);
    expect(playbackFor('hard', false).stepMs).toBe(SIMON_CONFIG.hard.stepMs);
  });

  it('pays 2 x starMultiplier per finished run: 2 / 6 / 10', () => {
    expect(LEVELS.map(simonStars)).toEqual([2, 6, 10]);
    for (const l of LEVELS) expect(simonStars(l)).toBe(2 * starMultiplier(l));
  });

  it('a whole easy run of watching fits well inside 60 s', () => {
    const { minLength, maxLength } = SIMON_CONFIG.easy;
    let total = 0;
    for (let len = minLength; len <= maxLength; len++) total += playbackDuration(len, SIMON_CONFIG.easy);
    expect(total).toBeLessThan(25_000);
  });
});

describe('sequences', () => {
  it('generates the requested length from the four animals, never three in a row', () => {
    for (let i = 0; i < 300; i++) {
      const length = 2 + (i % 7);
      const seq = generateSequence(length, seededRand(i));
      expect(seq).toHaveLength(length);
      for (const a of seq) expect([0, 1, 2, 3]).toContain(a);
      expect(noTriples(seq)).toBe(true);
    }
  });

  it('uses all four animals over many sequences', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) generateSequence(8, seededRand(i)).forEach((a) => seen.add(a));
    expect(seen.size).toBe(4);
  });

  it('extends by one step and keeps the earlier steps', () => {
    for (let i = 0; i < 100; i++) {
      const seq = generateSequence(4, seededRand(i));
      const longer = extendSequence(seq, seededRand(i + 1000));
      expect(longer).toHaveLength(5);
      expect(longer.slice(0, 4)).toEqual(seq);
      expect(noTriples(longer)).toBe(true);
    }
  });

  it('a fresh sequence has the same length and differs', () => {
    for (let i = 0; i < 200; i++) {
      const seq = generateSequence(4 + (i % 5), seededRand(i));
      const fresh = freshSequence(seq, seededRand(i + 500));
      expect(fresh).toHaveLength(seq.length);
      expect(fresh.join('')).not.toBe(seq.join(''));
    }
  });

  it('a run starts at the tier minimum', () => {
    for (const level of LEVELS) {
      const state = startRun(level, seededRand(3));
      expect(state.sequence).toHaveLength(SIMON_CONFIG[level].minLength);
      expect(state.input).toBe(0);
    }
  });
});

describe('press', () => {
  const state = (sequence: number[], input = 0, missStep = -1, missCount = 0): SimonState =>
    ({ sequence: sequence as SimonState['sequence'], input, missStep, missCount });

  it('a right tap moves to the next step', () => {
    const r = press(state([0, 1, 2]), 0, 'easy');
    expect(r.outcome).toBe('next');
    expect(r.state.input).toBe(1);
    expect(r.state.sequence).toEqual([0, 1, 2]);
  });

  it('repeating the whole sequence adds one step and starts over', () => {
    const r = press(state([0, 1], 1), 1, 'easy', false, seededRand(2));
    expect(r.outcome).toBe('grow');
    expect(r.state.sequence).toHaveLength(3);
    expect(r.state.sequence.slice(0, 2)).toEqual([0, 1]);
    expect(r.state.input).toBe(0);
  });

  it('repeating the longest sequence of the tier finishes the run', () => {
    const full = generateSequence(4, seededRand(5));
    const r = press(state(full, 3), full[3], 'easy');
    expect(r.outcome).toBe('done');
    expect(r.state.sequence).toEqual(full);
  });

  it('easy/medium: a miss replays the same sequence from the start', () => {
    for (const level of ['easy', 'medium'] as const) {
      const r = press(state([0, 1, 2], 1), 3, level);
      expect(r.outcome).toBe('retry');
      expect(r.state.sequence).toEqual([0, 1, 2]);
      expect(r.state.input).toBe(0);
      expect(r.state).toMatchObject({ missStep: 1, missCount: 1 });
    }
  });

  it('hard and challenges: a miss gives a fresh sequence of the same length, never shorter', () => {
    for (const [level, challenge] of [['hard', false], ['easy', true], ['medium', true]] as const) {
      const before = state(generateSequence(SIMON_CONFIG[level].minLength + 1, seededRand(9)), 1);
      const r = press(before, (before.sequence[1] + 1) % 4, level, challenge, seededRand(10));
      expect(r.outcome).toBe('fresh');
      expect(r.state.sequence).toHaveLength(before.sequence.length);
      expect(r.state.sequence.join('')).not.toBe(before.sequence.join(''));
      expect(r.state.input).toBe(0);
      expect(r.state.missCount).toBe(0);
    }
  });

  it('counts misses on the same step and starts over on a different step', () => {
    let s = state([0, 1, 2], 1);
    s = press(s, 3, 'easy').state;
    expect(s).toMatchObject({ missStep: 1, missCount: 1 });
    // Back through step 0, then miss on step 1 again.
    s = press(s, 0, 'easy').state;
    s = press(s, 3, 'easy').state;
    expect(s).toMatchObject({ missStep: 1, missCount: 2 });
    // A miss on another step starts counting again.
    s = press(s, 3, 'easy').state;
    expect(s).toMatchObject({ missStep: 0, missCount: 1 });
  });

  it('highlights the right animal after two misses on that step only', () => {
    let s = state([2, 1, 3]);
    expect(hintAnimal(s)).toBeNull();
    s = press(s, 2, 'easy').state; // step 0 right
    s = press(s, 0, 'easy').state; // miss on step 1
    expect(hintAnimal(s)).toBeNull();
    s = press(s, 2, 'easy').state;
    s = press(s, 0, 'easy').state; // second miss on step 1
    expect(s.missCount).toBe(HINT_AFTER_MISSES);
    // Replay: nothing highlighted on step 0, the right animal on step 1.
    expect(hintAnimal(s)).toBeNull();
    s = press(s, 2, 'easy').state;
    expect(hintAnimal(s)).toBe(1);
    // Past that step the hint goes away.
    s = press(s, 1, 'easy').state;
    expect(hintAnimal(s)).toBeNull();
  });

  it('growing the sequence clears the miss counters', () => {
    let s = state([0, 1], 0, 1, 2);
    s = press(s, 0, 'easy').state;
    const r = press(s, 1, 'easy', false, seededRand(1));
    expect(r.outcome).toBe('grow');
    expect(r.state).toMatchObject({ missStep: -1, missCount: 0 });
  });
});

describe('whole runs', () => {
  it('a perfect child finishes every tier at the maximum length, growing one step at a time', () => {
    for (const level of LEVELS) {
      const { minLength, maxLength } = SIMON_CONFIG[level];
      let s = startRun(level, seededRand(4));
      const lengths = [s.sequence.length];
      for (let guard = 0; guard < 200; guard++) {
        const r = press(s, s.sequence[s.input], level, false, seededRand(guard));
        s = r.state;
        if (r.outcome === 'grow') lengths.push(s.sequence.length);
        if (r.outcome === 'done') break;
      }
      expect(lengths).toEqual(Array.from({ length: maxLength - minLength + 1 }, (_, i) => minLength + i));
      expect(s.sequence).toHaveLength(maxLength);
    }
  });

  it('a clumsy child never gets a sequence below the tier minimum or above the maximum, and still finishes', () => {
    for (const level of LEVELS) {
      for (const challenge of [false, true]) {
        const { minLength, maxLength } = SIMON_CONFIG[level];
        const rand = seededRand(level.length * 7 + (challenge ? 1 : 0));
        let s = startRun(level, rand);
        let done = false;
        for (let guard = 0; guard < 5000 && !done; guard++) {
          // Taps the right animal 70% of the time.
          const tap = rand() < 0.7 ? s.sequence[s.input] : (s.sequence[s.input] + 1 + Math.floor(rand() * 3)) % 4;
          const r = press(s, tap, level, challenge, rand);
          s = r.state;
          expect(s.sequence.length).toBeGreaterThanOrEqual(minLength);
          expect(s.sequence.length).toBeLessThanOrEqual(maxLength);
          expect(noTriples(s.sequence)).toBe(true);
          done = r.outcome === 'done';
        }
        expect(done).toBe(true);
      }
    }
  });
});
