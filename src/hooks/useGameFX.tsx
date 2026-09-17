import type { ReactNode } from 'react';
import { GameFXContext, type GameFXValue } from './gameFXContext';

export function GameFXProvider({ value, children }: { value: GameFXValue; children: ReactNode }) {
  return <GameFXContext.Provider value={value}>{children}</GameFXContext.Provider>;
}
