import type { GameDifficulty } from '../types/game';
import { starMultiplier, wrongMeansNewRound } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';
import { shuffle } from '../utils/shuffle';

/**
 * Sink or Float: predict whether an object sinks or floats, then watch it drop.
 * - easy: 2 obvious objects, shown one at a time
 * - medium: 3-4 objects with mixed clues (some float, some sink, no tricks)
 * - hard: 4-5 objects, at least 2 surprising ones; predict all, then drop all
 */
export type Prediction = 'float' | 'sink';

export interface SinkFloatObject {
  emoji: string;
  floats: boolean;
}

export interface SinkFloatRound {
  objects: SinkFloatObject[];
}

/**
 * - single: one object on screen at a time (easy)
 * - free: all objects on screen, child picks the order, each drops right away (medium)
 * - batch: predict every object first, then they all drop (hard)
 */
export type SinkFloatFlow = 'single' | 'free' | 'batch';

/** A finished round pays this base times `starMultiplier`: 2 / 6 / 10 stars. */
export const SINK_FLOAT_BASE_STARS = 2;

export function sinkFloatStars(level: GameDifficulty): number {
  return SINK_FLOAT_BASE_STARS * starMultiplier(level);
}

export function flowFor(level: GameDifficulty): SinkFloatFlow {
  return level === 'easy' ? 'single' : level === 'medium' ? 'free' : 'batch';
}

const obj = (emoji: string, floats: boolean): SinkFloatObject => ({ emoji, floats });

/** Everybody agrees on these. The only pool easy draws from. */
export const OBVIOUS_FLOATS = [obj('🦆', true), obj('🎈', true), obj('🪵', true), obj('🍃', true), obj('🏐', true)];
export const OBVIOUS_SINKS = [obj('🪨', false), obj('🔑', false), obj('⚓', false), obj('🪙', false), obj('🔨', false)];

/** Everyday things a child has seen in the bath or the kitchen sink. */
export const COMMON_FLOATS = [obj('🍎', true), obj('🍊', true), obj('🧊', true), obj('🍌', true), obj('🛶', true)];
export const COMMON_SINKS = [obj('🥕', false), obj('🥄', false), obj('✂️', false), obj('🔋', false), obj('🧱', false)];

/** Hard only: heavy things that float and light things that sink. */
export const SURPRISING_FLOATS = [obj('🚢', true), obj('🎃', true), obj('🍉', true), obj('🥥', true)];
export const SURPRISING_SINKS = [obj('🥚', false), obj('🥔', false), obj('🍐', false), obj('🍇', false), obj('🥑', false)];

export const SURPRISING: ReadonlySet<string> = new Set([...SURPRISING_FLOATS, ...SURPRISING_SINKS].map((o) => o.emoji));

/** Object count per level; hard and medium pick one of the two. */
export const OBJECT_COUNTS: Record<GameDifficulty, readonly number[]> = {
  easy: [2],
  medium: [3, 4],
  hard: [4, 5],
};

function takeFrom(pool: readonly SinkFloatObject[], used: Set<string>, rand: Rand): SinkFloatObject {
  const free = pool.filter((o) => !used.has(o.emoji));
  const chosen = pick(free.length ? free : pool, rand);
  used.add(chosen.emoji);
  return chosen;
}

export function generateSinkFloatRound(level: GameDifficulty, rand: Rand = Math.random): SinkFloatRound {
  const count = pick(OBJECT_COUNTS[level], rand);
  const used = new Set<string>();
  const objects: SinkFloatObject[] = [];

  if (level === 'easy') {
    objects.push(takeFrom(OBVIOUS_FLOATS, used, rand), takeFrom(OBVIOUS_SINKS, used, rand));
  } else if (level === 'medium') {
    const floats = [...OBVIOUS_FLOATS, ...COMMON_FLOATS];
    const sinks = [...OBVIOUS_SINKS, ...COMMON_SINKS];
    // At least one of each side, then anything from either pool.
    objects.push(takeFrom(floats, used, rand), takeFrom(sinks, used, rand));
    while (objects.length < count) objects.push(takeFrom(rand() < 0.5 ? floats : sinks, used, rand));
  } else {
    const floats = [...COMMON_FLOATS, ...SURPRISING_FLOATS];
    const sinks = [...COMMON_SINKS, ...SURPRISING_SINKS];
    // Two surprises (one of each kind) so the child cannot lean on "heavy sinks".
    objects.push(
      takeFrom(SURPRISING_FLOATS, used, rand),
      takeFrom(SURPRISING_SINKS, used, rand),
    );
    while (objects.length < count) objects.push(takeFrom(rand() < 0.5 ? floats : sinks, used, rand));
  }

  return { objects: shuffle(objects, rand) };
}

/** What the child sees: the same set of objects is "the same round", whatever the order. */
export function sinkFloatRoundKey(round: SinkFloatRound): string {
  return round.objects.map((o) => o.emoji).sort().join('');
}

export function isCorrectPrediction(object: SinkFloatObject, prediction: Prediction): boolean {
  return object.floats === (prediction === 'float');
}

export function trueResult(object: SinkFloatObject): Prediction {
  return object.floats ? 'float' : 'sink';
}

/** Hard: every object is predicted before any drop. */
export function allPredicted(round: SinkFloatRound, predictions: Readonly<Record<string, Prediction>>): boolean {
  return round.objects.every((o) => predictions[o.emoji] !== undefined);
}

export interface DropResult {
  emoji: string;
  result: Prediction;
  correct: boolean;
}

/** The drops of a batch round, in shelf order, with the true result of each. */
export function resolveBatch(round: SinkFloatRound, predictions: Readonly<Record<string, Prediction>>): DropResult[] {
  return round.objects.map((o) => ({
    emoji: o.emoji,
    result: trueResult(o),
    correct: predictions[o.emoji] !== undefined && isCorrectPrediction(o, predictions[o.emoji]),
  }));
}

/** After a wrong prediction has been shown: ask again (easy/medium) or move to a fresh round. */
export function afterWrong(level: GameDifficulty, challengeMode = false): 'retry' | 'fresh' {
  return wrongMeansNewRound(level, challengeMode) ? 'fresh' : 'retry';
}
