import { createContext, useContext } from 'react';
import type { GameProps } from '../types/game';

export type GameFXValue = GameProps;

export const GameFXContext = createContext<GameFXValue | null>(null);

export function useGameFX(): GameFXValue {
  const ctx = useContext(GameFXContext);
  if (!ctx) {
    throw new Error('useGameFX must be used within GameFXProvider');
  }
  return ctx;
}
