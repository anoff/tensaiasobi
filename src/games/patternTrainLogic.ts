import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';

/**
 * Pattern Train: wagons repeat a core pattern, one wagon is a "?".
 * - easy: AB, the gap is always the next wagon
 * - medium: AAB / ABB / ABC, still the next wagon
 * - hard: AABB / ABCD / ABAC, and the gap can sit in the middle of the train
 */
export interface PatternRound {
  wagons: string[];
  gapIndex: number;
  answer: string;
  options: string[];
}

export const PATTERN_STARS = CHOICE_STARS;

/** Cores as index strings into the round's symbol set. */
const CORES: Record<GameDifficulty, string[]> = {
  easy: ['01'],
  medium: ['001', '011', '012'],
  hard: ['0011', '0123', '0102', '0012'],
};

const THEMES = [
  ['🔴', '🔵', '🟡', '🟢', '🟣'],
  ['🐶', '🐱', '🐰', '🐸', '🐼'],
  ['🍎', '🍌', '🍇', '🍓', '🍊'],
  ['⭐', '🌙', '☀️', '☁️', '❄️'],
  ['🚗', '🚲', '🚂', '✈️', '🚀'],
];

export function generatePatternRound(level: GameDifficulty, rand: Rand = Math.random): PatternRound {
  const core = pick(CORES[level], rand).split('').map(Number);
  const symbols = shuffle(pick(THEMES, rand), rand);
  const repeats = level === 'easy' ? 3 : 2;
  const length = core.length * repeats + 1;
  const wagons = Array.from({ length }, (_, i) => symbols[core[i % core.length]]);

  // The last wagon is the question, except on hard where it may be any wagon
  // after the first full repeat (so the pattern is visible before the gap).
  const gapIndex = level === 'hard' && rand() < 0.5
    ? core.length + Math.floor(rand() * (length - core.length))
    : length - 1;
  const answer = wagons[gapIndex];

  const used = [...new Set(core)].map((i) => symbols[i]);
  const optionCount = level === 'hard' ? 4 : 3;
  // Distractors: the pattern's own symbols first (the real trap), then a stranger.
  const distractors = [...shuffle(used.filter((s) => s !== answer), rand), ...symbols.filter((s) => !used.includes(s))];
  const options = shuffle([answer, ...distractors.slice(0, optionCount - 1)], rand);

  return { wagons, gapIndex, answer, options };
}
