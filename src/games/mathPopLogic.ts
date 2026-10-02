import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

export type MathOperator = '+' | '-';

export interface MathQuestion {
  num1: number;
  num2: number;
  operator: MathOperator;
  answer: number;
  options: number[];
  /** Fruit drawn for the picture row (easy, and medium after a miss). */
  emoji: string;
}

/**
 * Math Pop absorbed Fruit Math Pop: one game, one ladder.
 * - easy (preschool): add within 5, with fruit pictures and dot tallies
 * - medium (preschool stretch / school start): add & subtract within 10;
 *   the pictures come back after a miss
 * - hard (school): add & subtract within 20
 * The old two-digit-plus-two-digit hard level (sums up to 198) is gone.
 */
export const MATH_POP_MAX: Record<GameDifficulty, number> = { easy: 5, medium: 10, hard: 20 };

export const MATH_POP_FRUIT = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍'];

const OPTION_COUNT = 3;

type Rand = () => number;

function randomInt(min: number, max: number, rand: Rand): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function operands(level: GameDifficulty, operator: MathOperator, rand: Rand): [number, number] {
  const max = MATH_POP_MAX[level];
  if (level === 'hard') {
    // Keep hard about bridging ten, not about "1 + 1".
    if (operator === '+') {
      const a = randomInt(3, max - 3, rand);
      return [a, randomInt(Math.max(2, 11 - a), max - a, rand)];
    }
    const a = randomInt(11, max, rand);
    return [a, randomInt(2, a - 1, rand)];
  }
  if (operator === '+') {
    const a = randomInt(1, max - 1, rand);
    return [a, randomInt(1, max - a, rand)];
  }
  const a = randomInt(2, max, rand);
  return [a, randomInt(1, a - 1, rand)];
}

export function generateMathQuestion(level: GameDifficulty, rand: Rand = Math.random): MathQuestion {
  const max = MATH_POP_MAX[level];
  const operator: MathOperator = level === 'easy' || rand() < 0.5 ? '+' : '-';
  const [num1, num2] = operands(level, operator, rand);
  const answer = operator === '+' ? num1 + num2 : num1 - num2;

  // Distractors sit right next to the answer so the child has to work it out.
  const options = new Set<number>([answer]);
  for (let spread = 1; options.size < OPTION_COUNT; spread++) {
    for (const candidate of shuffle([answer - spread, answer + spread])) {
      if (options.size < OPTION_COUNT && candidate >= 0 && candidate <= max) options.add(candidate);
    }
  }

  return {
    num1,
    num2,
    operator,
    answer,
    options: shuffle([...options]),
    emoji: MATH_POP_FRUIT[randomInt(0, MATH_POP_FRUIT.length - 1, rand)],
  };
}
