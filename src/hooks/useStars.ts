import { useState, useCallback, useRef } from 'react';

const STORAGE_KEY = 'gamification_stars';

function loadStars(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function saveStars(value: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, value.toString());
  } catch (e) {
    console.error('Error saving stars', e);
  }
}

export interface StarEarnAnimation {
  id: number;
  amount: number;
}

export interface UseStarsReturn {
  stars: number;
  addStars: (amount: number) => void;
  spendStars: (amount: number) => boolean;
  resetStars: () => void;
  /** Active fly-up animations to render */
  pendingAnimations: StarEarnAnimation[];
  /** Call when an animation finishes to remove it */
  clearAnimation: (id: number) => void;
}

export function useStars(): UseStarsReturn {
  const [stars, setStars] = useState<number>(loadStars);
  const [pendingAnimations, setPendingAnimations] = useState<StarEarnAnimation[]>([]);
  const animIdRef = useRef(0);

  const addStars = useCallback((amount: number) => {
    if (amount <= 0) return;
    setStars((prev) => {
      const next = prev + amount;
      saveStars(next);
      return next;
    });
    // Queue a fly-up animation
    const id = ++animIdRef.current;
    setPendingAnimations((prev) => [...prev, { id, amount }]);
  }, []);

  const spendStars = useCallback((amount: number): boolean => {
    let success = false;
    setStars((prev) => {
      if (prev >= amount) {
        const next = prev - amount;
        saveStars(next);
        success = true;
        return next;
      }
      return prev;
    });
    return success;
  }, []);

  const resetStars = useCallback(() => {
    setStars(0);
    saveStars(0);
    setPendingAnimations([]);
  }, []);

  const clearAnimation = useCallback((id: number) => {
    setPendingAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { stars, addStars, spendStars, resetStars, pendingAnimations, clearAnimation };
}
