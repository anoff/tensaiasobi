import { useContext, useState } from 'react';
import { GameFXContext } from './gameFXContext';
import { difficultyForAge } from '../utils/difficulty';
import type { GameDifficulty } from '../types/game';

/** Difficulty state that starts at the level for the home age switch. */
export function useAgeDifficulty() {
  const band = useContext(GameFXContext)?.ageBand ?? 'little';
  return useState<GameDifficulty>(difficultyForAge(band).start);
}
