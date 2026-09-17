import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const SESSION_MINUTE_OPTIONS = [0, 5, 10, 15, 20] as const;
export type SessionMinutes = (typeof SESSION_MINUTE_OPTIONS)[number];

export function useSessionTimer() {
  const [minutes, setMinutesState] = useLocalStorage<SessionMinutes>('settings_session_minutes', 0);
  const [endsAt, setEndsAt] = useLocalStorage<number | null>('session_ends_at', null);
  const [locked, setLocked] = useLocalStorage<boolean>('session_locked', false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        setLocked(true);
        setEndsAt(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, setEndsAt, setLocked]);

  const setMinutes = useCallback((value: SessionMinutes) => {
    setMinutesState(value);
    if (value === 0) {
      setEndsAt(null);
      setLocked(false);
    }
  }, [setMinutesState, setEndsAt, setLocked]);

  const startOrRefresh = useCallback(() => {
    if (minutes <= 0) {
      setEndsAt(null);
      setLocked(false);
      return;
    }
    setEndsAt(Date.now() + minutes * 60_000);
    setLocked(false);
  }, [minutes, setEndsAt, setLocked]);

  const startIfIdle = useCallback(() => {
    if (minutes <= 0 || locked) return;
    setEndsAt((prev) => prev ?? Date.now() + minutes * 60_000);
  }, [minutes, locked, setEndsAt]);

  const unlock = useCallback(() => {
    setLocked(false);
    setEndsAt(null);
  }, [setEndsAt, setLocked]);

  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;

  return {
    minutes,
    setMinutes,
    endsAt,
    remainingMs,
    locked,
    startOrRefresh,
    startIfIdle,
    unlock,
  };
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
