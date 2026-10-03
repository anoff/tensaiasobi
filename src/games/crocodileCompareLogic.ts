import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, randomInt, type Rand } from '../utils/random';

export type CompareSymbol = '<' | '=' | '>';

/** One side of the comparison: a plain amount, or a small sum on hard. */
export interface CompareSide {
  value: number;
  /** Present on hard sum rounds: `[a, b]` means "a + b". */
  addends?: [number, number];
}

export interface CompareRound {
  left: CompareSide;
  right: CompareSide;
  /** Easy/medium: the side the crocodile eats. Never equal there. */
  bigger: 'left' | 'right' | null;
  /** Hard: the symbol that belongs between the sides. */
  symbol: CompareSymbol;
  emoji: string;
}

/**
 * Crocodile Compare: the crocodile always eats the bigger side.
 * - easy: two groups of fruit, 1–5 each, tap the side with more
 * - medium: two numbers up to 20, tap the bigger (dots appear after a miss)
 * - hard: numbers up to 100 or a small sum vs a number, pick <, = or >
 * "Equal" only exists on hard; on the tap-the-bigger levels it would break
 * the one rule the child is learning.
 */
export const COMPARE_MAX: Record<GameDifficulty, number> = { easy: 5, medium: 20, hard: 100 };
export const COMPARE_STARS = CHOICE_STARS;

const FRUIT = ['🍎', '🍓', '🍊', '🍇', '🍒', '🍐'];

export function symbolFor(left: number, right: number): CompareSymbol {
  return left < right ? '<' : left > right ? '>' : '=';
}

function distinctPair(min: number, max: number, rand: Rand): [number, number] {
  const a = randomInt(min, max, rand);
  let b = randomInt(min, max - 1, rand);
  if (b >= a) b += 1;
  return [a, b];
}

function hardRound(rand: Rand): [CompareSide, CompareSide] {
  const kind = rand();
  if (kind < 0.4) {
    // A sum within 20 against a number close to it: 3 + 4 ○ 6.
    const a = randomInt(2, 9, rand);
    const b = randomInt(2, 9, rand);
    const sum = a + b;
    const roll = rand();
    const other = roll < 0.34 ? sum : Math.max(1, sum + (roll < 0.67 ? -randomInt(1, 2, rand) : randomInt(1, 2, rand)));
    const sumSide: CompareSide = { value: sum, addends: [a, b] };
    return rand() < 0.5 ? [sumSide, { value: other }] : [{ value: other }, sumSide];
  }
  // The same number on both sides, so "=" comes up regularly.
  if (kind < 0.55) {
    const n = randomInt(10, 99, rand);
    return [{ value: n }, { value: n }];
  }
  // Two-digit numbers, often with swapped digits so place value matters (47 ○ 74).
  const tens = randomInt(1, 9, rand);
  const ones = randomInt(0, 9, rand);
  const a = tens * 10 + ones;
  const swapped = ones * 10 + tens;
  const b = rand() < 0.5 && swapped >= 10 && swapped !== a ? swapped : distinctPair(10, 99, rand)[0];
  return b === a ? [{ value: a }, { value: a === 99 ? 98 : a + 1 }] : [{ value: a }, { value: b }];
}

export function generateCompareRound(level: GameDifficulty, rand: Rand = Math.random): CompareRound {
  const emoji = pick(FRUIT, rand);
  if (level === 'hard') {
    const [left, right] = hardRound(rand);
    return { left, right, bigger: null, symbol: symbolFor(left.value, right.value), emoji };
  }
  const [a, b] = distinctPair(1, COMPARE_MAX[level], rand);
  return {
    left: { value: a },
    right: { value: b },
    bigger: a > b ? 'left' : 'right',
    symbol: symbolFor(a, b),
    emoji,
  };
}
