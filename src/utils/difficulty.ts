import type { GameDifficulty } from '../types/game';

export function starMultiplier(diff: GameDifficulty): number {
  return diff === 'easy' ? 1 : diff === 'medium' ? 3 : 5;
}

/**
 * Select-answer games: on hard (and in parent challenges) a wrong tap moves on
 * to a fresh question instead of allowing a retry, so smashing every button
 * until one is right stops paying off. Easy/medium stay forgiving.
 */
export function wrongMeansNewRound(diff: GameDifficulty, challengeMode = false): boolean {
  return challengeMode || diff === 'hard';
}
