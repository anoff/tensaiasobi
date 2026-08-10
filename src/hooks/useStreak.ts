import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export function useStreak(prefix: string) {
  const [streak, setStreak] = useLocalStorage<number>(`${prefix}_streak`, 0);
  const [highScore, setHighScore] = useLocalStorage<number>(`${prefix}_highscore`, 0);

  const registerCorrect = useCallback((): number => {
    const next = streak + 1;
    setStreak(next);
    if (next > highScore) setHighScore(next);
    return next;
  }, [streak, highScore, setStreak, setHighScore]);

  const resetStreak = useCallback(() => {
    setStreak(0);
  }, [setStreak]);

  return { streak, highScore, registerCorrect, resetStreak };
}
