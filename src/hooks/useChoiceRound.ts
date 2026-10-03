import { useState } from 'react';
import { useGameFX } from './gameFXContext';
import { useAgeDifficulty } from './useAgeDifficulty';
import { useLater } from './useLater';
import { wrongMeansNewRound } from '../utils/difficulty';
import { freshRound } from '../utils/freshRound';
import type { GameDifficulty } from '../types/game';

/** Pause on a solved round before the next one, in ms. */
const NEXT_MS = 1400;

/**
 * Shared flow for "pick the right one" games: age-based level, one round at
 * a time, stars on a hit, and on a miss either a retry (easy/medium) or a
 * fresh round (hard and parent challenges). `roundKey` names what the child
 * sees (not the option order), so a new round never repeats the last one.
 */
export function useChoiceRound<R>(
  generate: (level: GameDifficulty) => R,
  stars: Record<GameDifficulty, number>,
  roundKey: (round: R) => string,
) {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const [level, setLevel] = useAgeDifficulty();
  const [round, setRound] = useState<R>(() => generate(level));
  const [roundNo, setRoundNo] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  /** True once the child missed this round; games use it to show a hint. */
  const [missed, setMissed] = useState(false);
  const { later, cancelAll } = useLater();

  const nextRound = (lvl: GameDifficulty = level) => {
    cancelAll();
    setRound((prev) => freshRound(() => generate(lvl), prev, roundKey));
    setRoundNo((n) => n + 1);
    setSolved(false);
    setWrong(null);
    setMissed(false);
  };

  const changeLevel = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
    nextRound(lvl);
  };

  const choose = (choice: string, correct: boolean) => {
    if (solved || wrong !== null) return;
    if (correct) {
      setSolved(true);
      playSuccess();
      onStarEarned?.(stars[level]);
      later(() => nextRound(level), NEXT_MS);
      return;
    }
    playError();
    setWrong(choice);
    setMissed(true);
    if (wrongMeansNewRound(level, challengeMode)) later(() => nextRound(level), 900);
    else later(() => setWrong(null), 700);
  };

  return { level, round, roundNo, solved, wrong, missed, changeLevel, choose, nextRound };
}
