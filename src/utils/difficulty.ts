import type { AgeBand, GameDifficulty } from '../types/game';

/**
 * Stars per correct answer in the pick-one games: the flat 2 of Odd One /
 * First Sound on easy, one more per level. Keeps a quick multiple-choice tap
 * from out-earning a finished maze or puzzle.
 */
export const CHOICE_STARS: Record<GameDifficulty, number> = { easy: 2, medium: 3, hard: 4 };

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

/**
 * Every game keeps all three levels; the age band picks where to start and
 * locks the one that does not fit: Kita starts easy (hard locked), school
 * starts medium (easy locked).
 */
export function difficultyForAge(band: AgeBand): { start: GameDifficulty; locked: GameDifficulty } {
  return band === 'big' ? { start: 'medium', locked: 'easy' } : { start: 'easy', locked: 'hard' };
}
