import { useState, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface StarEarnAnimation {
  id: number;
  amount: number;
}

const DEFAULT_ALLOWED_GAMES: Record<string, boolean> = {
  math: true,
  odd: true,
  doodle: false,
  memory: true,
  maze: false,
  trace: false,
  emojiMatch: false,
  anlaut: true,
  shiritori: true,
};

export function useChallenge() {
  const [challengeActive, setChallengeActive] = useLocalStorage<boolean>('challenge_active', false);
  const [challengeStarsTarget, setChallengeStarsTarget] = useLocalStorage<number>('challenge_stars_target', 10);
  const [challengeStarsEarned, setChallengeStarsEarned] = useLocalStorage<number>('challenge_stars_earned', 0);
  const [challengeAllowedGames, setChallengeAllowedGames] = useLocalStorage<Record<string, boolean>>('challenge_allowed_games', DEFAULT_ALLOWED_GAMES);

  const [pendingChallengeAnimations, setPendingChallengeAnimations] = useState<StarEarnAnimation[]>([]);
  const animIdRef = useRef(0);

  const challengeStarsRemaining = Math.max(0, challengeStarsTarget - challengeStarsEarned);

  const startChallenge = useCallback((targetStars: number, allowedGames: Record<string, boolean>) => {
    setChallengeStarsTarget(targetStars);
    setChallengeAllowedGames(allowedGames);
    setChallengeStarsEarned(0);
    setChallengeActive(true);
    setPendingChallengeAnimations([]);
  }, [setChallengeActive, setChallengeStarsTarget, setChallengeStarsEarned, setChallengeAllowedGames]);

  const addChallengeStars = useCallback((amount: number) => {
    if (amount <= 0) return;
    setChallengeStarsEarned((prev) => {
      const next = prev + amount;
      return next;
    });

    // Queue fly-up animation
    const id = ++animIdRef.current;
    setPendingChallengeAnimations((prev) => [...prev, { id, amount }]);
  }, [setChallengeStarsEarned]);

  const claimChallengeReward = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    setPendingChallengeAnimations([]);
  }, [setChallengeActive, setChallengeStarsEarned]);

  const cancelChallenge = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    setPendingChallengeAnimations([]);
  }, [setChallengeActive, setChallengeStarsEarned]);

  const clearChallengeAnimation = useCallback((id: number) => {
    setPendingChallengeAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const allowedGamesMerged = { ...DEFAULT_ALLOWED_GAMES, ...challengeAllowedGames };

  return {
    challengeActive,
    challengeStarsTarget,
    challengeStarsEarned,
    challengeStarsRemaining,
    challengeAllowedGames: allowedGamesMerged,
    pendingChallengeAnimations,
    startChallenge,
    addChallengeStars,
    claimChallengeReward,
    cancelChallenge,
    clearChallengeAnimation,
  };
}
