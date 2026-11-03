import { shuffle } from '../utils/shuffle';
import type { AgeBand, GameDifficulty } from '../types/game';
import { pick, randomInt, type Rand } from '../utils/random';

export type MathOperator = '+' | '-' | '×' | '÷';

export interface MathQuestion {
  num1: number;
  num2: number;
  operator: MathOperator;
  answer: number;
  options: number[];
  /** Fruit drawn for the picture row / the × fruit rows. */
  emoji: string;
}

/**
 * Math Pop has its own 1-2-3 star ladder per age band (no answer below 0):
 * - Preschool easy: fruit pictures only, adding, sum <= 8
 * - Preschool medium: fruits plus numbers, adding, sum <= 10
 * - Preschool hard: adding to 20, taking away only within 10
 * - School easy: + and - within 20
 * - School medium: + and - within 50 without crossing a ten, plus the 1-5
 *   times tables (about 1 question in 4); × shows fruit in rows
 * - School hard: + and - within 100 with carrying, 1-10 times tables, and
 *   dividing by 2, 5 and 10 with whole answers (50 % +/-, 30 % ×, 20 % ÷)
 */
export const MATH_POP_MAX: Record<AgeBand, Record<GameDifficulty, number>> = {
  little: { easy: 8, medium: 10, hard: 20 },
  big: { easy: 20, medium: 50, hard: 100 },
};

export const MATH_POP_FRUIT = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍'];

const OPTION_COUNT = 3;

function pickOperator(band: AgeBand, level: GameDifficulty, rand: Rand): MathOperator {
  if (band === 'little') return level === 'hard' && rand() < 0.5 ? '-' : '+';
  const r = rand();
  if (level === 'medium' && r < 0.25) return '×';
  if (level === 'hard') {
    if (r < 0.3) return '×';
    if (r < 0.5) return '÷';
  }
  return rand() < 0.5 ? '+' : '-';
}

function operands(band: AgeBand, level: GameDifficulty, operator: MathOperator, rand: Rand): [number, number] {
  if (operator === '×') {
    const top = level === 'medium' ? 5 : 10;
    return [randomInt(1, top, rand), randomInt(1, top, rand)];
  }
  if (operator === '÷') {
    const divisor = pick([2, 5, 10], rand);
    return [divisor * randomInt(1, 10, rand), divisor];
  }
  if (band === 'big' && level === 'medium') {
    // Within 50, ones digits never cross a ten (no carrying, no borrowing).
    for (;;) {
      if (operator === '+') {
        const a = randomInt(10, 49, rand);
        const b = randomInt(1, 50 - a, rand);
        if ((a % 10) + (b % 10) <= 9) return [a, b];
      } else {
        const a = randomInt(11, 50, rand);
        const b = randomInt(1, a - 1, rand);
        if (a % 10 >= b % 10) return [a, b];
      }
    }
  }
  if (band === 'big' && level === 'hard') {
    if (operator === '+') {
      const a = randomInt(10, 90, rand);
      return [a, randomInt(2, 100 - a, rand)];
    }
    const a = randomInt(20, 100, rand);
    return [a, randomInt(2, a - 1, rand)];
  }
  // Preschool hard takes away only within 10; everything else spans the level max.
  const max = band === 'little' && level === 'hard' && operator === '-' ? 10 : MATH_POP_MAX[band][level];
  if (operator === '+') {
    const a = randomInt(1, max - 1, rand);
    return [a, randomInt(1, max - a, rand)];
  }
  const a = randomInt(2, max, rand);
  return [a, randomInt(1, a - 1, rand)];
}

function solve(num1: number, num2: number, operator: MathOperator): number {
  switch (operator) {
    case '+': return num1 + num2;
    case '-': return num1 - num2;
    case '×': return num1 * num2;
    case '÷': return num1 / num2;
  }
}

export function generateMathQuestion(
  level: GameDifficulty,
  band: AgeBand = 'little',
  rand: Rand = Math.random,
): MathQuestion {
  const max = MATH_POP_MAX[band][level];
  const operator = pickOperator(band, level, rand);
  const [num1, num2] = operands(band, level, operator, rand);
  const answer = solve(num1, num2, operator);

  // Distractors sit right next to the answer so the child has to work it out.
  const options = new Set<number>([answer]);
  for (let spread = 1; options.size < OPTION_COUNT; spread++) {
    for (const candidate of shuffle([answer - spread, answer + spread], rand)) {
      if (options.size < OPTION_COUNT && candidate >= 0 && candidate <= max) options.add(candidate);
    }
  }

  return {
    num1,
    num2,
    operator,
    answer,
    options: shuffle([...options], rand),
    emoji: pick(MATH_POP_FRUIT, rand),
  };
}
