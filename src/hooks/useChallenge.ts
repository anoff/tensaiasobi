import { useCallback, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface StarEarnAnimation {
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
  letterTrace: false,
  emojiMatch: false,
  anlaut: true,
  shiritori: true,
  puzzle: false,
  dispatch: false,
  physics: true,
  towerSort: true,
  numberTrain: false,
  waveSurfer: false,
  snorkelPearlFinder: false,
};

export function useChallenge() {
  const [challengeActive, setChallengeActive] = useLocalStorage<boolean>('challenge_active', false);
  const [challengeStarsTarget, setChallengeStarsTarget] = useLocalStorage<number>('challenge_stars_target', 10);
  const [challengeStarsEarned, setChallengeStarsEarned] = useLocalStorage<number>('challenge_stars_earned', 0);
  const [challengeAllowedGames, setChallengeAllowedGames] = useLocalStorage<Record<string, boolean>>('challenge_allowed_games', DEFAULT_ALLOWED_GAMES);
  const [challengeCouponId, setChallengeCouponId] = useLocalStorage<string>('challenge_coupon_id', '');

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
    setChallengeStarsTarget(targetStars);
    setChallengeAllowedGames(allowedGames);
    setChallengeCouponId(couponId);
    setChallengeStarsEarned(0);
    setChallengeActive(true);
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsTarget, setChallengeStarsEarned, setChallengeAllowedGames, setChallengeCouponId, clearAllAnimations]);

  const addChallengeStars = useCallback((amount: number) => {
    if (amount <= 0) return;
    setChallengeStarsEarned((prev) => prev + amount);
    queueAnimation(amount);
  }, [setChallengeStarsEarned, queueAnimation]);

  const claimChallengeReward = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    setChallengeCouponId('');
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsEarned, setChallengeCouponId, clearAllAnimations]);

  const cancelChallenge = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    setChallengeCouponId('');
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsEarned, setChallengeCouponId, clearAllAnimations]);

  const allowedGamesMerged = { ...DEFAULT_ALLOWED_GAMES, ...challengeAllowedGames };

  return {
    challengeActive,
    challengeStarsTarget,
    challengeStarsEarned,
    challengeStarsRemaining,
    challengeAllowedGames: allowedGamesMerged,
    challengeCouponId,
    pendingChallengeAnimations: pendingAnimations,
    startChallenge,
    addChallengeStars,
    claimChallengeReward,
    cancelChallenge,
    clearChallengeAnimation: clearAnimation,
  };
}
