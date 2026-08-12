import { shuffle } from '../utils/shuffle';
import { TOWER_SORT_THEMES, type TowerSortTheme } from './towerSortThemes';
import type { GameDifficulty } from '../types/game';

export interface FruitMathRound {
  emoji: string;
  left: number;
  right: number;
  operation: '+' | '-';
  result: number;
  choices: number[];
}

const MAX_TOTAL: Record<GameDifficulty, number> = { easy: 5, medium: 5, hard: 10 };

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function generateFruitMathRound(
  difficulty: GameDifficulty,
  theme: TowerSortTheme = TOWER_SORT_THEMES[1],
): FruitMathRound {
  const max = MAX_TOTAL[difficulty];
  const operation: '+' | '-' = difficulty === 'easy' || Math.random() < 0.5 ? '+' : '-';
  let left: number;
  let right: number;
  let result: number;

  if (operation === '+') {
    left = randomInt(1, max - 1);
    right = randomInt(1, max - left);
    result = left + right;
  } else {
    left = randomInt(2, max);
    right = randomInt(1, left - 1);
    result = left - right;
  }

  const choices = new Set<number>([result]);
  while (choices.size < (difficulty === 'easy' ? 2 : 3)) {
    choices.add(randomInt(1, max));
  }

  return {
    emoji: theme.emojis[randomInt(0, theme.emojis.length - 1)],
    left,
    right,
    operation,
    result,
    choices: shuffle([...choices]),
  };
}
