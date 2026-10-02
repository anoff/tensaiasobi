import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that is cleared on unmount, plus a way to drop everything pending. */
export function useLater() {
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const cancelAll = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  }, []);

  return { later, cancelAll };
}
