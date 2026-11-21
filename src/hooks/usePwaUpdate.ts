import { useCallback, useEffect, useRef, useState } from 'react';
import { watchWaitingServiceWorker, type ApplyPwaUpdate, type PwaUpdateWatch } from '../platform/pwa';

/** Tracks a waiting service-worker update and exposes a function that applies it (skipWaiting + reload). */
export function usePwaUpdate(watch: PwaUpdateWatch = watchWaitingServiceWorker) {
  const applyRef = useRef<ApplyPwaUpdate | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    return watch((apply) => {
      applyRef.current = apply;
      setUpdateAvailable(true);
    });
  }, [watch]);

  const applyUpdate = useCallback(() => {
    applyRef.current?.();
  }, []);

  return { updateAvailable, applyUpdate };
}
