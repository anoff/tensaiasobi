import { useCallback, useRef, useState } from 'react';

export interface StarEarnAnimation {
  id: number;
  amount: number;
}

export function useFlyUpAnimations() {
  const [pendingAnimations, setPendingAnimations] = useState<StarEarnAnimation[]>([]);
  const animIdRef = useRef(0);

  const queueAnimation = useCallback((amount: number) => {
    if (amount <= 0) return;
    const id = ++animIdRef.current;
    setPendingAnimations((prev) => [...prev, { id, amount }]);
  }, []);

  const clearAnimation = useCallback((id: number) => {
    setPendingAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAllAnimations = useCallback(() => {
    setPendingAnimations([]);
  }, []);

  return { pendingAnimations, queueAnimation, clearAnimation, clearAllAnimations };
}
