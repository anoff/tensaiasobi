import { useCallback, useEffect, useRef } from 'react';
import { useGameFX } from './gameFXContext';

/** Games that pay stars per answer count this many right answers as one finished round. */
export const ANSWERS_PER_ROUND = 5;

/** Returns a counter for right answers that reports a finished round every `every` answers. */
export function useRoundTally(every = ANSWERS_PER_ROUND): () => void {
  const { onRoundComplete } = useGameFX();
  const latest = useRef(onRoundComplete);
  useEffect(() => {
    latest.current = onRoundComplete;
  }, [onRoundComplete]);
  const count = useRef(0);
  return useCallback(() => {
    count.current += 1;
    if (count.current % every === 0) latest.current?.();
  }, [every]);
}
