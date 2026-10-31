import { useEffect, useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import { useGameFX } from '../hooks/gameFXContext';
import { useRoundTally } from '../hooks/useRoundTally';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { useTranslation } from '../hooks/useTranslation';
import { INK, LEAF, hardShadow } from '../theme/blockTable';
import type { GameDifficulty } from '../types/game';
import {
  DICE_STARS, FLASHES_PER_ROUND, generateDiceRound, nextDiceRound, resolveAnswer, revealMs, diceRoundKey,
} from './diceFlashLogic';

/**
 * - ready: the blank white card (the die) is tossed, landing as the flash starts (READY_MS)
 * - flash: dots visible for the tier's flash time
 * - answer: blank card, answer buttons visible
 * - right: dots back and pulsing, stars paid
 * - reveal: after a miss the dots come back (3 s on easy/medium, a short look before a fresh flash on hard)
 * - complete: five flashes done (no die picture, just confetti and the victory line)
 */
type Phase = 'ready' | 'flash' | 'answer' | 'right' | 'reveal' | 'complete';

/** The toss animation (`.dice-toss` in index.css) lasts exactly this long, so it lands as the flash starts. */
const READY_MS = 800;
const RIGHT_MS = 1300;
const COMPLETE_MS = 1800;

/** The die card scales with the shared --game-scale (1 / 0.75 / 0.6 on short / tiny phones). */
const CARD_SIZE = 'calc(13rem * var(--game-scale))';

export default function DiceFlash() {
  const { t } = useTranslation();
  const { playPop, playSuccess, onStarEarned, challengeMode } = useGameFX();
  const tallyRound = useRoundTally();
  const [level, setLevel] = useAgeDifficulty();
  const [round, setRound] = useState(() => generateDiceRound(level));
  const [flashNo, setFlashNo] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  /** Flashes answered right in this set of five. */
  const [progress, setProgress] = useState(0);
  const [fresh, setFresh] = useState(false);

  const showDots = phase === 'flash' || phase === 'right' || phase === 'reveal';

  useEffect(() => {
    const go = (next: () => void, ms: number) => {
      const id = window.setTimeout(next, ms);
      return () => window.clearTimeout(id);
    };
    const newFlash = (resetProgress: boolean) => {
      setRound((prev) => nextDiceRound(level, prev));
      setFlashNo((n) => n + 1);
      if (resetProgress) setProgress(0);
      setPhase('ready');
    };
    switch (phase) {
      case 'ready':
        return go(() => setPhase('flash'), READY_MS);
      case 'flash':
        return go(() => setPhase('answer'), round.flashMs);
      case 'right':
        return go(() => (progress >= FLASHES_PER_ROUND ? setPhase('complete') : newFlash(false)), RIGHT_MS);
      case 'reveal':
        return go(() => (fresh ? newFlash(false) : setPhase('ready')), revealMs(level, challengeMode));
      case 'complete':
        return go(() => newFlash(true), COMPLETE_MS);
      default:
        return undefined;
    }
  }, [phase, round.flashMs, progress, fresh, level, challengeMode]);

  const changeLevel = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
    setRound((prev) => nextDiceRound(lvl, prev));
    setFlashNo((n) => n + 1);
    setProgress(0);
    setPhase('ready');
  };

  const choose = (choice: number) => {
    if (phase !== 'answer') return;
    const outcome = resolveAnswer(round, choice, level, challengeMode);
    if (outcome === 'correct') {
      playSuccess();
      onStarEarned?.(DICE_STARS[level]);
      tallyRound();
      setProgress((p) => p + 1);
      setPhase('right');
    } else {
      // No buzzer, no red: the dots simply come back so the child can see the answer.
      playPop();
      setFresh(outcome === 'fresh');
      setPhase('reveal');
    }
  };

  const prompt =
    phase === 'reveal'
      ? fresh
        ? t.diceFlash.newFlash
        : t.diceFlash.lookAgain
      : phase === 'answer'
        ? t.diceFlash.howMany
        : '';

  return (
    <div className="flex-1 flex flex-col items-center gap-3 short:gap-2 p-3 short:py-1 w-full select-none max-w-lg mx-auto">
      {phase === 'right' && <GameConfetti key={`right-${flashNo}`} pieces={45} />}
      {phase === 'complete' && <GameConfetti pieces={140} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl short:text-2xl font-black text-slate-800 tracking-tight">{t.diceFlash.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm short:hidden">{t.diceFlash.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        data-testid="dice-stage"
        data-phase={phase}
        data-count={round.count}
        data-flash-ms={round.flashMs}
        data-layout={diceRoundKey(round)}
        data-progress={progress}
        className="w-full flex flex-col items-center gap-3 short:gap-1.5"
      >
        <div data-testid="dice-progress" aria-hidden="true" className="flex gap-2 text-2xl leading-none">
          {Array.from({ length: FLASHES_PER_ROUND }, (_, i) => (
            <span key={i} className={i < progress ? '' : 'opacity-30 grayscale'}>⭐</span>
          ))}
        </div>

        <div
          data-testid="dice-card"
          className={`relative rounded-[2rem] border-[4px] bg-white ${phase === 'ready' ? 'dice-toss' : ''} ${phase === 'right' ? 'animate-pop-in' : ''} ${phase === 'complete' ? 'invisible' : ''}`}
          style={{ borderColor: INK, boxShadow: hardShadow(), width: CARD_SIZE, height: CARD_SIZE }}
        >
          {/* The card itself is the die: blank until the flash, so only real dots are ever counted. */}
          {showDots && round.dots.map((d, i) => (
            <span
              key={`${flashNo}-${i}`}
              data-testid="dice-dot"
              className={`absolute w-[16%] aspect-square -ml-[8%] -mt-[8%] rounded-full ${phase === 'flash' ? 'dice-dot-in' : ''} ${phase === 'right' ? 'animate-pulse' : ''}`}
              style={{ left: `${d.x}%`, top: `${d.y}%`, backgroundColor: phase === 'right' ? LEAF : INK }}
            />
          ))}
        </div>

        <p aria-live="polite" className="min-h-6 text-slate-700 font-black text-lg text-center">{prompt}</p>

        {/* Buttons only exist once the flash is over; the space is kept so nothing jumps. */}
        <div className="min-h-[calc(var(--game-tile)*2+1rem)] w-full max-w-sm">
          {phase === 'answer' && (
            <div className={`grid gap-3 short:gap-2 ${round.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {round.options.map((option) => (
                <button
                  key={`${flashNo}-${option}`}
                  data-testid="dice-option"
                  data-value={option}
                  onClick={() => choose(option)}
                  className="min-h-[var(--game-tile)] rounded-3xl border-[3px] text-5xl font-black leading-none touch-manipulation cursor-pointer outline-none animate-pop-in active:translate-x-[3px] active:translate-y-[4px] active:[box-shadow:none] focus-visible:ring-4 focus-visible:ring-amber-400/70"
                  style={{ backgroundColor: '#fff8ec', borderColor: INK, color: INK, boxShadow: hardShadow(4, 5) }}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {phase === 'complete' && (
            <p data-testid="dice-victory" className="text-slate-800 font-black text-xl text-center pt-6">{t.diceFlash.victory}</p>
          )}
        </div>
      </div>

      <p className="text-slate-400 font-extrabold text-xs text-center short:hidden">{t.diceFlash.help}</p>
    </div>
  );
}
