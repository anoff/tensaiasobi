import type { GameDifficulty } from '../types/game';
import { starMultiplier, wrongMeansNewRound } from '../utils/difficulty';
import { randomInt, type Rand } from '../utils/random';

/**
 * Simon Lights: four animals light up one at a time, then the child taps them
 * back in the same order. A run starts at the tier's minimum length and gains
 * one step per successful repeat until the tier's maximum is repeated.
 * - easy: 2 to 4 steps, slow playback
 * - medium: 3 to 6 steps, medium playback
 * - hard: 4 to 8 steps, fast playback
 * Always four animals; hard is harder through length and speed, not targets.
 */
export const ANIMALS = ['🐵', '🐸', '🐱', '🐰'] as const;
export type AnimalIndex = 0 | 1 | 2 | 3;

export interface SimonConfig {
  minLength: number;
  maxLength: number;
  /** How long each animal stays lit, in ms. */
  stepMs: number;
  /** Dark pause between two animals, in ms. */
  gapMs: number;
}

export const SIMON_CONFIG: Record<GameDifficulty, SimonConfig> = {
  easy: { minLength: 2, maxLength: 4, stepMs: 900, gapMs: 300 },
  medium: { minLength: 3, maxLength: 6, stepMs: 650, gapMs: 220 },
  hard: { minLength: 4, maxLength: 8, stepMs: 420, gapMs: 160 },
};

/** After a miss on easy/medium the sequence replays at the slowest speed. */
export const REPLAY_CONFIG: Pick<SimonConfig, 'stepMs' | 'gapMs'> = {
  stepMs: SIMON_CONFIG.easy.stepMs,
  gapMs: SIMON_CONFIG.easy.gapMs,
};

/** Misses on the same step before the next correct animal is highlighted. */
export const HINT_AFTER_MISSES = 2;

/** A finished run pays 2 x starMultiplier: 2 / 6 / 10 stars, once, not per tap. */
export const SIMON_BASE_STARS = 2;

export function simonStars(level: GameDifficulty): number {
  return SIMON_BASE_STARS * starMultiplier(level);
}

export interface SimonState {
  sequence: AnimalIndex[];
  /** Index of the next animal the child has to tap. */
  input: number;
  /** Step of the latest miss, -1 for none. */
  missStep: number;
  /** Misses in a row on `missStep`. */
  missCount: number;
}

/** A new animal that does not make three in a row. */
function nextAnimal(sequence: readonly AnimalIndex[], rand: Rand): AnimalIndex {
  const n = sequence.length;
  const banned = n >= 2 && sequence[n - 1] === sequence[n - 2] ? sequence[n - 1] : -1;
  let pick = randomInt(0, ANIMALS.length - 1, rand);
  while (pick === banned) pick = randomInt(0, ANIMALS.length - 1, rand);
  return pick as AnimalIndex;
}

export function generateSequence(length: number, rand: Rand = Math.random): AnimalIndex[] {
  const sequence: AnimalIndex[] = [];
  while (sequence.length < length) sequence.push(nextAnimal(sequence, rand));
  return sequence;
}

/** Same sequence plus one more step. */
export function extendSequence(sequence: readonly AnimalIndex[], rand: Rand = Math.random): AnimalIndex[] {
  return [...sequence, nextAnimal(sequence, rand)];
}

/** A new random sequence of the same length that differs from the old one. */
export function freshSequence(previous: readonly AnimalIndex[], rand: Rand = Math.random): AnimalIndex[] {
  const key = previous.join('');
  let next = generateSequence(previous.length, rand);
  for (let i = 0; i < 20 && next.join('') === key; i++) next = generateSequence(previous.length, rand);
  return next;
}

export function startRun(level: GameDifficulty, rand: Rand = Math.random): SimonState {
  return { sequence: generateSequence(SIMON_CONFIG[level].minLength, rand), input: 0, missStep: -1, missCount: 0 };
}

export type PressOutcome =
  /** Right animal, more to tap. */
  | 'next'
  /** Whole sequence repeated; it grew by one step. */
  | 'grow'
  /** The longest sequence of the tier was repeated: the run is finished. */
  | 'done'
  /** Wrong on easy/medium: replay the same sequence slowly and try again. */
  | 'retry'
  /** Wrong on hard or in a challenge: a new random sequence of the same length. */
  | 'fresh';

export interface PressResult {
  state: SimonState;
  outcome: PressOutcome;
}

export function press(
  state: SimonState,
  animal: number,
  level: GameDifficulty,
  challengeMode = false,
  rand: Rand = Math.random,
): PressResult {
  const { maxLength } = SIMON_CONFIG[level];
  if (animal === state.sequence[state.input]) {
    const input = state.input + 1;
    if (input < state.sequence.length) return { state: { ...state, input }, outcome: 'next' };
    if (state.sequence.length >= maxLength) return { state: { ...state, input }, outcome: 'done' };
    return {
      state: { sequence: extendSequence(state.sequence, rand), input: 0, missStep: -1, missCount: 0 },
      outcome: 'grow',
    };
  }
  if (wrongMeansNewRound(level, challengeMode)) {
    return { state: { sequence: freshSequence(state.sequence, rand), input: 0, missStep: -1, missCount: 0 }, outcome: 'fresh' };
  }
  const missCount = state.missStep === state.input ? state.missCount + 1 : 1;
  return { state: { ...state, input: 0, missStep: state.input, missCount }, outcome: 'retry' };
}

/** The animal to highlight on the child's turn: only on easy/medium, after two misses on this very step. */
export function hintAnimal(state: SimonState): AnimalIndex | null {
  if (state.missCount >= HINT_AFTER_MISSES && state.missStep === state.input) return state.sequence[state.input];
  return null;
}

/** Playback speed: the tier's own, or the slow replay after a miss. */
export function playbackFor(level: GameDifficulty, replay: boolean): Pick<SimonConfig, 'stepMs' | 'gapMs'> {
  return replay ? REPLAY_CONFIG : { stepMs: SIMON_CONFIG[level].stepMs, gapMs: SIMON_CONFIG[level].gapMs };
}

/** Time to show a whole sequence, in ms (for pacing and for tests). */
export function playbackDuration(length: number, speed: Pick<SimonConfig, 'stepMs' | 'gapMs'>): number {
  return length * (speed.stepMs + speed.gapMs);
}
