import { useEffect, useRef } from 'react';

interface LocalWakeLockSentinel {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: (this: LocalWakeLockSentinel, ev: Event) => void): void;
  removeEventListener(type: 'release', listener: (this: LocalWakeLockSentinel, ev: Event) => void): void;
}

export function useWakeLock() {
  const wakeLockRef = useRef<LocalWakeLockSentinel | null>(null);

  useEffect(() => {
    // Check if Screen Wake Lock API is supported
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      console.warn('Screen Wake Lock API is not supported in this browser.');
      return;
    }

    const requestWakeLock = async () => {
      try {
        if (wakeLockRef.current) {
          return;
        }
        const navigatorWakeLock = (navigator as unknown as {
          wakeLock: { request(type: 'screen'): Promise<LocalWakeLockSentinel> };
        }).wakeLock;
        
        wakeLockRef.current = await navigatorWakeLock.request('screen');
        
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
          console.log('Wake Lock was released');
        });
        console.log('Wake Lock is active');
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error(`Failed to request Wake Lock: ${err.name}, ${err.message}`);
        } else {
          console.error('Failed to request Wake Lock:', err);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    // Request wake lock initially
    requestWakeLock();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release()
          .then(() => {
            wakeLockRef.current = null;
          })
          .catch((err: unknown) => {
            console.error('Failed to release Wake Lock:', err);
          });
      }
    };
  }, []);
}
