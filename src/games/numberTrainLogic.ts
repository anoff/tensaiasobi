import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

export interface NumberTrainRound {
  passengerCount: number;
  answer: number;
  delta: number; // 0 for exact count, +1 for "one more", -1 for "one less"
  targets: number[];
}

interface DifficultyConfig {
  max: number;
  targetCount: number;
  delta: 'none' | 'plusMinus';
  stars: number;
}

/**
 * Difficulty scales the rule (range, ±1), never the number of wagons or
 * stations: everything fits in one ten-seat wagon and ≤ 4 station buttons.
 */
export const NUMBER_TRAIN_CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: { max: 5, targetCount: 3, delta: 'none', stars: 1 },
  medium: { max: 10, targetCount: 4, delta: 'none', stars: 2 },
  hard: { max: 10, targetCount: 4, delta: 'plusMinus', stars: 5 },
};

/** Seats in the single wagon: a five-frame on easy, a ten-frame otherwise. */
export function wagonSeats(difficulty: GameDifficulty): number {
  return NUMBER_TRAIN_CONFIG[difficulty].max <= 5 ? 5 : 10;
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function generateNumberTrainRound(difficulty: GameDifficulty): NumberTrainRound {
  const config = NUMBER_TRAIN_CONFIG[difficulty];
  const passengerCount = randomInt(1, config.max);

  let answer = passengerCount;
  let delta = 0;
  if (config.delta === 'plusMinus') {
    delta = passengerCount === 1 || Math.random() < 0.5 ? 1 : -1;
    answer = passengerCount + delta;
  }

  // Distractors stay near the answer so the child has to count, not guess by size.
  const highest = config.max + (config.delta === 'plusMinus' ? 1 : 0);
  const targets = new Set<number>([answer]);
  let spread = 2;
  while (targets.size < config.targetCount) {
    const candidate = answer + randomInt(-spread, spread);
    if (candidate >= 1 && candidate <= highest) targets.add(candidate);
    spread = Math.min(spread + 1, highest);
  }

  return { passengerCount, answer, delta, targets: shuffle([...targets]) };
}
