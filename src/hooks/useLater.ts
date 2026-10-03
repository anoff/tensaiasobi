import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that is cleared on unmount, plus a way to drop everything pending. */
export function useLater() {
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(window.clearTimeout);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const cancelAll = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current.clear();
  }, []);

  return { later, cancelAll };
}
