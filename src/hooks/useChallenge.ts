import { useCallback, useRef, useState } from 'react';
import { GAMES, defaultChallengeAllowedGames } from '../games/catalog';
import { useLocalStorage } from './useLocalStorage';

interface StarEarnAnimation {
  id: number;
  amount: number;
}

const DEFAULT_ALLOWED_GAMES = defaultChallengeAllowedGames();

export function useChallenge() {
  const [challengeActive, setChallengeActive] = useLocalStorage<boolean>('challenge_active', false);
  const [challengeStarsTarget, setChallengeStarsTarget] = useLocalStorage<number>('challenge_stars_target', 10);
  const [challengeStarsEarned, setChallengeStarsEarned] = useLocalStorage<number>('challenge_stars_earned', 0);
  const [challengeAllowedGames, setChallengeAllowedGames] = useLocalStorage<Record<string, boolean>>('challenge_allowed_games', DEFAULT_ALLOWED_GAMES);
  const [challengeCouponId, setChallengeCouponId] = useLocalStorage<string>('challenge_coupon_id', '');
  const [challengePlayUnlocked, setChallengePlayUnlocked] = useLocalStorage<boolean>('challenge_play_unlocked', false);

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

  const challengeStarsRemaining = Math.max(0, challengeStarsTarget - challengeStarsEarned);

  const startChallenge = useCallback((targetStars: number, allowedGames: Record<string, boolean>, couponId: string = '') => {
    const focusOnly = { ...allowedGames };
    for (const game of GAMES) {
      if (game.kind === 'play') focusOnly[game.id] = false;
    }
    setChallengeStarsTarget(targetStars);
    setChallengeAllowedGames(focusOnly);
    setChallengeCouponId(couponId);
    setChallengeStarsEarned(0);
    setChallengePlayUnlocked(false);
    setChallengeActive(true);
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsTarget, setChallengeStarsEarned, setChallengeAllowedGames, setChallengeCouponId, setChallengePlayUnlocked, clearAllAnimations]);

  const addChallengeStars = useCallback((amount: number) => {
    if (amount <= 0) return;
    setChallengeStarsEarned((prev) => prev + amount);
    queueAnimation(amount);
  }, [setChallengeStarsEarned, queueAnimation]);

  const claimChallengeReward = useCallback(() => {
    setChallengePlayUnlocked(true);
    clearAllAnimations();
  }, [setChallengePlayUnlocked, clearAllAnimations]);

  const cancelChallenge = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    setChallengeCouponId('');
    setChallengePlayUnlocked(false);
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsEarned, setChallengeCouponId, setChallengePlayUnlocked, clearAllAnimations]);

  const allowedGamesMerged = { ...DEFAULT_ALLOWED_GAMES, ...challengeAllowedGames };

  return {
    challengeActive,
    challengeStarsTarget,
    challengeStarsEarned,
    challengeStarsRemaining,
    challengeAllowedGames: allowedGamesMerged,
    challengeCouponId,
    challengePlayUnlocked,
    pendingChallengeAnimations: pendingAnimations,
    startChallenge,
    addChallengeStars,
    claimChallengeReward,
    cancelChallenge,
    clearChallengeAnimation: clearAnimation,
  };
}
