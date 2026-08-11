import type { GameDifficulty } from '../types/game';

export function starMultiplier(diff: GameDifficulty): number {
  return diff === 'easy' ? 1 : diff === 'medium' ? 3 : 5;
}
