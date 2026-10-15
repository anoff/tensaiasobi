import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS, wrongMeansNewRound } from '../utils/difficulty';
import { freshRound } from '../utils/freshRound';
import { randomInt, type Rand } from '../utils/random';
import { shuffle } from '../utils/shuffle';

/**
 * Dice Flash: a dot pattern flashes, then hides; the child taps the matching
 * number (subitizing).
 * - easy: 1-3 dots in die layouts, 2 s flash, 3 answers
 * - medium: 1-6 dots in standard die layouts, 1.5 s flash, 4 answers
 * - hard: 1-10 dots scattered at random, 1 s flash, 4 answers
 */
export interface Dot {
  /** Position in percent of the card, 0-100 from the top-left. */
  x: number;
  y: number;
}

export interface DiceRound {
  count: number;
  dots: Dot[];
  /** Answer buttons in ascending order; the right count is in there exactly once. */
  options: number[];
  flashMs: number;
}

export interface DiceConfig {
  min: number;
  max: number;
  flashMs: number;
  optionCount: number;
  scatter: boolean;
}

export const DICE_CONFIG: Record<GameDifficulty, DiceConfig> = {
  easy: { min: 1, max: 3, flashMs: 2000, optionCount: 3, scatter: false },
  medium: { min: 1, max: 6, flashMs: 1500, optionCount: 4, scatter: false },
  hard: { min: 1, max: 10, flashMs: 1000, optionCount: 4, scatter: true },
};

/** Flashes per round (one set); stars are paid per correct flash. */
export const FLASHES_PER_ROUND = 5;

/** Flat stars per correct answer, as in the other pick-one games (decision 3A): 2 / 3 / 4. */
export const DICE_STARS = CHOICE_STARS;

/** How long the dots stay visible after a miss: 3 s to look and replay, or a short look before a fresh flash. */
export const REVEAL_RETRY_MS = 3000;
export const REVEAL_FRESH_MS = 1500;

export function revealMs(level: GameDifficulty, challengeMode = false): number {
  return wrongMeansNewRound(level, challengeMode) ? REVEAL_FRESH_MS : REVEAL_RETRY_MS;
}

/** Standard die faces on a 3 x 3 grid. */
const LO = 25;
const MID = 50;
const HI = 75;
const FACES: Record<number, Dot[]> = {
  1: [{ x: MID, y: MID }],
  2: [{ x: LO, y: LO }, { x: HI, y: HI }],
  3: [{ x: LO, y: LO }, { x: MID, y: MID }, { x: HI, y: HI }],
  4: [{ x: LO, y: LO }, { x: HI, y: LO }, { x: LO, y: HI }, { x: HI, y: HI }],
  5: [{ x: LO, y: LO }, { x: HI, y: LO }, { x: MID, y: MID }, { x: LO, y: HI }, { x: HI, y: HI }],
  6: [{ x: LO, y: LO }, { x: HI, y: LO }, { x: LO, y: MID }, { x: HI, y: MID }, { x: LO, y: HI }, { x: HI, y: HI }],
};

export function dieFace(count: number): Dot[] {
  const face = FACES[count];
  if (!face) throw new Error(`No die face for ${count}`);
  return face.map((d) => ({ ...d }));
}

/** Smallest centre-to-centre gap between scattered dots, in percent of the card. */
export const SCATTER_GAP = 19;
const SCATTER_EDGE = 12;

/** Random dots with a minimum gap so none touch and every dot stays countable. */
export function scatterDots(count: number, rand: Rand = Math.random): Dot[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const dots: Dot[] = [];
    for (let guard = 0; dots.length < count && guard < 400; guard++) {
      const d = { x: randomInt(SCATTER_EDGE, 100 - SCATTER_EDGE, rand), y: randomInt(SCATTER_EDGE, 100 - SCATTER_EDGE, rand) };
      if (dots.every((o) => Math.hypot(o.x - d.x, o.y - d.y) >= SCATTER_GAP)) dots.push(d);
    }
    if (dots.length === count) return dots;
  }
  // Never reached in practice (10 dots fit with plenty of room); a grid is a safe fallback.
  return Array.from({ length: count }, (_, i) => ({ x: 20 + (i % 4) * 20, y: 20 + Math.floor(i / 4) * 25 }));
}

/** Answer buttons: the right count plus the nearest wrong numbers, so guessing "about right" is not enough. */
export function answerOptions(count: number, level: GameDifficulty, rand: Rand = Math.random): number[] {
  const { min, max, optionCount } = DICE_CONFIG[level];
  const others: number[] = [];
  for (let n = min; n <= max; n++) if (n !== count) others.push(n);
  // Nearest first; ties broken at random.
  const nearest = shuffle(others, rand).sort((a, b) => Math.abs(a - count) - Math.abs(b - count));
  return [count, ...nearest.slice(0, optionCount - 1)].sort((a, b) => a - b);
}

export function generateDiceRound(level: GameDifficulty, rand: Rand = Math.random): DiceRound {
  const config = DICE_CONFIG[level];
  const count = randomInt(config.min, config.max, rand);
  return {
    count,
    dots: config.scatter ? scatterDots(count, rand) : dieFace(count),
    options: answerOptions(count, level, rand),
    flashMs: config.flashMs,
  };
}

/** What the child sees. Die faces repeat by count; scattered layouts by their exact dots. */
export function diceRoundKey(round: DiceRound): string {
  return round.dots.map((d) => `${d.x},${d.y}`).join(';');
}

/** A new flash that never shows the same dot layout as the one before. */
export function nextDiceRound(level: GameDifficulty, previous?: DiceRound, rand: Rand = Math.random): DiceRound {
  return freshRound(() => generateDiceRound(level, rand), previous, diceRoundKey, 30);
}

export type DiceOutcome = 'correct' | 'replay' | 'fresh';

/**
 * What happens after a tap: stars and the next flash on a hit; on a miss the
 * same flash again (easy/medium) or a fresh one (hard and parent challenges).
 */
export function resolveAnswer(round: DiceRound, choice: number, level: GameDifficulty, challengeMode = false): DiceOutcome {
  if (choice === round.count) return 'correct';
  return wrongMeansNewRound(level, challengeMode) ? 'fresh' : 'replay';
}
