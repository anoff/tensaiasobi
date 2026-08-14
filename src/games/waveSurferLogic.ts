import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

export interface MathChallenge {
  type: 'math';
  text: string;
  answer: number;
  options: number[];
}

export type WaveChallenge = MathChallenge;

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

const LANE_COUNT = 3;

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
    // Very simple addition with small numbers; no subtraction to avoid negatives.
    num1 = randomInt(1, 5);
    num2 = randomInt(1, 4);
    operator = '+';
    answer = num1 + num2;
    text = `${num1} ${operator} ${num2} = ?`;
  } else if (difficulty === 'medium') {
    num1 = randomInt(1, 9);
    num2 = randomInt(1, 9);
    operator = Math.random() > 0.5 ? '+' : '-';
    if (operator === '-' && num1 < num2) {
      [num1, num2] = [num2, num1];
    }
    answer = operator === '+' ? num1 + num2 : num1 - num2;
    text = `${num1} ${operator} ${num2} = ?`;
  } else {
    const maxAnswer = 50;
    operator = Math.random() > 0.5 ? '+' : '-';

    if (operator === '+') {
      num1 = randomInt(10, maxAnswer - 1);
      num2 = randomInt(1, maxAnswer - num1);
    } else {
      num1 = randomInt(10, maxAnswer);
      num2 = randomInt(1, num1);
    }

    answer = operator === '+' ? num1 + num2 : num1 - num2;
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

export function generateWaveRound(difficulty: GameDifficulty): WaveRound {
  const challenge = generateMathChallenge(difficulty);

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
  const emojis = ['🪨', '🐡'];

  if (difficulty === 'easy') {
    return obstacles;
  }

  const blockedLane = randomInt(0, LANE_COUNT - 1);
  obstacles.push({
    lane: blockedLane,
    x: stageWidth * 0.6,
    emoji: emojis[0],
  });
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
