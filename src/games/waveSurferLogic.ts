import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

export type WaveChallengeType = 'math' | 'spelling';

export interface MathChallenge {
  type: 'math';
  text: string;
  answer: number;
  options: number[];
}

export interface SpellingChallenge {
  type: 'spelling';
  text: string;
  answer: string;
  options: string[];
  promptEmoji?: string;
}

export type WaveChallenge = MathChallenge | SpellingChallenge;

export interface WaveRound {
  challenge: WaveChallenge;
  correctLane: number;
  itemLanes: number[];
}

export interface WaveObstacle {
  lane: number;
  x: number;
  emoji: string;
}

export interface WaveFrame {
  obstacles: WaveObstacle[];
}

export interface WordItem {
  emoji: string;
  word: string;
  startsWith: string;
}

const LANE_COUNT = 3;
const EASY_WORDS: WordItem[] = [
  { emoji: '🐈', word: 'cat', startsWith: 'C' },
  { emoji: '🐕', word: 'dog', startsWith: 'D' },
  { emoji: '🐘', word: 'elephant', startsWith: 'E' },
  { emoji: '🐟', word: 'fish', startsWith: 'F' },
  { emoji: '🍎', word: 'apple', startsWith: 'A' },
  { emoji: '🍌', word: 'banana', startsWith: 'B' },
  { emoji: '🦁', word: 'lion', startsWith: 'L' },
  { emoji: '☀️', word: 'sun', startsWith: 'S' },
];

const MEDIUM_WORDS: WordItem[] = [
  { emoji: '🦒', word: 'giraffe', startsWith: 'G' },
  { emoji: '🍉', word: 'watermelon', startsWith: 'W' },
  { emoji: '🦓', word: 'zebra', startsWith: 'Z' },
  { emoji: '🐧', word: 'penguin', startsWith: 'P' },
  { emoji: '🍍', word: 'pineapple', startsWith: 'P' },
  { emoji: '🐢', word: 'turtle', startsWith: 'T' },
];

const HARD_WORDS: WordItem[] = [
  { emoji: '🦈', word: 'shark', startsWith: 'SH' },
  { emoji: '🐌', word: 'snail', startsWith: 'SN' },
  { emoji: '🍒', word: 'cherry', startsWith: 'CH' },
  { emoji: '🦋', word: 'butterfly', startsWith: 'B' },
  { emoji: '🐬', word: 'dolphin', startsWith: 'D' },
  { emoji: '🦉', word: 'owl', startsWith: 'OW' },
];

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generateMathChallenge(difficulty: GameDifficulty): MathChallenge {
  let num1: number;
  let num2: number;
  let operator: string;
  let answer: number;
  let text: string;

  if (difficulty === 'easy') {
    num1 = randomInt(1, 9);
    num2 = randomInt(1, 9);
    operator = Math.random() > 0.5 ? '+' : '-';
    if (operator === '-' && num1 < num2) {
      [num1, num2] = [num2, num1];
    }
    answer = operator === '+' ? num1 + num2 : num1 - num2;
    text = `${num1} ${operator} ${num2} = ?`;
  } else if (difficulty === 'medium') {
    num1 = randomInt(10, 50);
    num2 = randomInt(1, 20);
    operator = Math.random() > 0.5 ? '+' : '-';
    if (operator === '-' && num1 < num2) {
      [num1, num2] = [num2, num1];
    }
    answer = operator === '+' ? num1 + num2 : num1 - num2;
    text = `${num1} ${operator} ${num2} = ?`;
  } else {
    num1 = randomInt(2, 9);
    num2 = randomInt(2, 9);
    answer = num1 * num2;
    operator = '×';
    text = `${num1} ${operator} ${num2} = ?`;
  }

  const optionsSet = new Set<number>([answer]);
  while (optionsSet.size < LANE_COUNT) {
    const offset = randomInt(1, 8);
    const direction = Math.random() > 0.5 ? 1 : -1;
    const wrong = answer + offset * direction;
    if (wrong >= 0 && wrong !== answer) {
      optionsSet.add(wrong);
    }
  }

  return {
    type: 'math',
    text,
    answer,
    options: shuffle(Array.from(optionsSet)),
  };
}

function generateSpellingChallenge(difficulty: GameDifficulty): SpellingChallenge {
  const wordList = difficulty === 'easy' ? EASY_WORDS : difficulty === 'medium' ? MEDIUM_WORDS : HARD_WORDS;
  const target = wordList[randomInt(0, wordList.length - 1)];
  const answer = difficulty === 'hard' ? target.word : target.startsWith;

  const text = difficulty === 'hard' ? `Find: ${target.emoji}` : `Starts with '${answer}'`;

  const optionsSet = new Set<string>([answer]);
  while (optionsSet.size < LANE_COUNT) {
    const candidate = wordList[randomInt(0, wordList.length - 1)];
    const value = difficulty === 'hard' ? candidate.word : candidate.startsWith;
    if (value !== answer) {
      optionsSet.add(value);
    }
  }

  return {
    type: 'spelling',
    text,
    answer,
    options: shuffle(Array.from(optionsSet)),
    promptEmoji: difficulty === 'hard' ? target.emoji : undefined,
  };
}

export function generateWaveRound(difficulty: GameDifficulty): WaveRound {
  const challengeType: WaveChallengeType =
    difficulty === 'easy' ? 'math' : Math.random() > 0.5 ? 'math' : 'spelling';

  const challenge = challengeType === 'math'
    ? generateMathChallenge(difficulty)
    : generateSpellingChallenge(difficulty);

  const itemLanes = shuffle([0, 1, 2]);
  const correctIndex = challenge.options.findIndex((opt) => opt === challenge.answer);
  const correctLane = itemLanes[correctIndex];

  return {
    challenge,
    correctLane,
    itemLanes,
  };
}

export function generateObstacles(difficulty: GameDifficulty, stageWidth: number): WaveObstacle[] {
  const obstacles: WaveObstacle[] = [];
  const emojis = difficulty === 'medium' ? ['🪨'] : ['🪨', '🦈'];

  if (difficulty === 'easy') {
    return obstacles;
  }

  if (difficulty === 'medium') {
    const blockedLane = randomInt(0, LANE_COUNT - 1);
    obstacles.push({
      lane: blockedLane,
      x: stageWidth * 0.6,
      emoji: emojis[0],
    });
    return obstacles;
  }

  // Hard: multiple obstacles, but never block all lanes.
  const blockedLanes = new Set<number>();
  const count = randomInt(2, 4);
  for (let i = 0; i < count; i++) {
    const lane = randomInt(0, LANE_COUNT - 1);
    if (blockedLanes.size === LANE_COUNT - 1 && !blockedLanes.has(lane)) {
      // Adding this lane would block every lane; skip it.
      continue;
    }
    blockedLanes.add(lane);
    const x = stageWidth * (0.35 + Math.random() * 0.5);
    obstacles.push({
      lane,
      x,
      emoji: emojis[randomInt(0, emojis.length - 1)],
    });
  }

  return obstacles;
}

export function ensureClearLane(obstacles: WaveObstacle[]): WaveObstacle[] {
  const blockedLanes = new Set(obstacles.map((o) => o.lane));
  if (blockedLanes.size < LANE_COUNT) {
    return obstacles;
  }

  // All lanes blocked at some x position; remove obstacles from the leftmost lane
  // near the surfer to guarantee a path.
  const lanes = Array.from({ length: LANE_COUNT }, (_, i) => i);
  const laneToClear = lanes[randomInt(0, LANE_COUNT - 1)];
  return obstacles.filter((o) => o.lane !== laneToClear);
}

export function generateWaveFrame(difficulty: GameDifficulty, stageWidth: number): WaveFrame {
  const obstacles = generateObstacles(difficulty, stageWidth);
  return {
    obstacles: ensureClearLane(obstacles),
  };
}
