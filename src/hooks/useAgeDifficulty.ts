import { useContext, useState } from 'react';
import { GameFXContext } from './gameFXContext';
import { difficultyForAge } from '../utils/difficulty';
import type { GameDifficulty } from '../types/game';

/**
 * Difficulty state that starts at the level for the home age switch.
 * A game with its own per-age ladder (Math Pop) passes its own start level.
 */
export function useAgeDifficulty(start?: GameDifficulty) {
  const band = useContext(GameFXContext)?.ageBand ?? 'little';
  return useState<GameDifficulty>(start ?? difficultyForAge(band).start);
}
