import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useFlyUpAnimations } from './useFlyUpAnimations';

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
  puzzle: true,
  dispatch: true,
  physics: true,
  towerSort: true,
};

export function useChallenge() {
  const [challengeActive, setChallengeActive] = useLocalStorage<boolean>('challenge_active', false);
  const [challengeStarsTarget, setChallengeStarsTarget] = useLocalStorage<number>('challenge_stars_target', 10);
  const [challengeStarsEarned, setChallengeStarsEarned] = useLocalStorage<number>('challenge_stars_earned', 0);
  const [challengeAllowedGames, setChallengeAllowedGames] = useLocalStorage<Record<string, boolean>>('challenge_allowed_games', DEFAULT_ALLOWED_GAMES);

  const { pendingAnimations, queueAnimation, clearAnimation, clearAllAnimations } = useFlyUpAnimations();

  const challengeStarsRemaining = Math.max(0, challengeStarsTarget - challengeStarsEarned);

  const startChallenge = useCallback((targetStars: number, allowedGames: Record<string, boolean>) => {
    setChallengeStarsTarget(targetStars);
    setChallengeAllowedGames(allowedGames);
    setChallengeStarsEarned(0);
    setChallengeActive(true);
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsTarget, setChallengeStarsEarned, setChallengeAllowedGames, clearAllAnimations]);

  const addChallengeStars = useCallback((amount: number) => {
    if (amount <= 0) return;
    setChallengeStarsEarned((prev) => {
      const next = prev + amount;
      return next;
    });
    queueAnimation(amount);
  }, [setChallengeStarsEarned, queueAnimation]);

  const claimChallengeReward = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsEarned, clearAllAnimations]);

  const cancelChallenge = useCallback(() => {
    setChallengeActive(false);
    setChallengeStarsEarned(0);
    clearAllAnimations();
  }, [setChallengeActive, setChallengeStarsEarned, clearAllAnimations]);

  const allowedGamesMerged = { ...DEFAULT_ALLOWED_GAMES, ...challengeAllowedGames };

  return {
    challengeActive,
    challengeStarsTarget,
    challengeStarsEarned,
    challengeStarsRemaining,
    challengeAllowedGames: allowedGamesMerged,
    pendingChallengeAnimations: pendingAnimations,
    startChallenge,
    addChallengeStars,
    claimChallengeReward,
    cancelChallenge,
    clearChallengeAnimation: clearAnimation,
  };
}
