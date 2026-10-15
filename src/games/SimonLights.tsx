import { useEffect, useRef, useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import { useGameFX } from '../hooks/gameFXContext';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { useLater } from '../hooks/useLater';
import { useTranslation } from '../hooks/useTranslation';
import { INK, hardShadow } from '../theme/blockTable';
import type { GameDifficulty } from '../types/game';
import {
  ANIMALS, hintAnimal, playbackDuration, playbackFor, press, simonStars, startRun, type SimonState,
} from './simonLogic';

/**
 * - ready: a beat before the animals show the sequence
 * - watch: the animals light up one at a time; taps are blocked
 * - turn: the child taps the sequence back
 * - right: the sequence was repeated; every animal glows together, then it grows by one
 * - miss: a gentle wobble, then the sequence replays (easy/medium) or a new one starts (hard, challenges)
 * - complete: the longest sequence of the tier was repeated
 */
type Phase = 'ready' | 'watch' | 'turn' | 'right' | 'miss' | 'complete';

const READY_MS = 800;
const RIGHT_MS = 900;
const MISS_MS = 700;
const COMPLETE_MS = 2000;
const PRESS_GLOW_MS = 300;

/** Glow and soft fill for each animal. No red: a miss never looks like an error. */
const TILE_COLORS = [
  { glow: '#ffc21a', soft: '#fff1c2' },
  { glow: '#1f9a62', soft: '#c9ecd9' },
  { glow: '#38bdf8', soft: '#d4effc' },
  { glow: '#a78bfa', soft: '#e6defd' },
] as const;

export default function SimonLights() {
  const { t } = useTranslation();
  const { playPop, playSuccess, onStarEarned, challengeMode } = useGameFX();
  const [level, setLevel] = useAgeDifficulty();
  const [game, setGame] = useState<SimonState>(() => startRun(level));
  const [phase, setPhase] = useState<Phase>('ready');
  const [lit, setLit] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [wrongTap, setWrongTap] = useState<number | null>(null);
  /** After a miss on easy/medium the sequence replays slowly. */
  const [replay, setReplay] = useState(false);
  /** After a miss on hard (or in a challenge) a new sequence starts. */
  const [fresh, setFresh] = useState(false);
  const { later, cancelAll } = useLater();
  // The sound callbacks change identity on every app render; the playback timers must not restart with them.
  const popRef = useRef(playPop);
  useEffect(() => {
    popRef.current = playPop;
  });

  useEffect(() => {
    const timers: number[] = [];
    const at = (fn: () => void, ms: number) => {
      timers.push(window.setTimeout(fn, ms));
    };
    switch (phase) {
      case 'ready':
        at(() => {
          setLit(null);
          setPhase('watch');
        }, READY_MS);
        break;
      case 'watch': {
        const speed = playbackFor(level, replay);
        game.sequence.forEach((animal, i) => {
          const start = i * (speed.stepMs + speed.gapMs);
          at(() => {
            setLit(animal);
            popRef.current();
          }, start);
          at(() => setLit(null), start + speed.stepMs);
        });
        at(() => setPhase('turn'), playbackDuration(game.sequence.length, speed));
        break;
      }
      case 'right':
        at(() => setPhase('ready'), RIGHT_MS);
        break;
      case 'miss':
        at(() => {
          setWrongTap(null);
          setPhase('ready');
        }, MISS_MS);
        break;
      case 'complete':
        at(() => {
          setGame(startRun(level));
          setReplay(false);
          setFresh(false);
          setPhase('ready');
        }, COMPLETE_MS);
        break;
      default:
        break;
    }
    return () => timers.forEach(window.clearTimeout);
  }, [phase, game.sequence, level, replay]);

  const changeLevel = (lvl: GameDifficulty) => {
    playPop();
    cancelAll();
    setLevel(lvl);
    setGame(startRun(lvl));
    setReplay(false);
    setFresh(false);
    setLit(null);
    setPressed(null);
    setWrongTap(null);
    setPhase('ready');
  };

  const tap = (animal: number) => {
    // Taps are ignored unless it is the child's turn.
    if (phase !== 'turn') return;
    const { state, outcome } = press(game, animal, level, challengeMode);
    setGame(state);
    if (outcome === 'next') {
      playPop();
      setPressed(animal);
      later(() => setPressed(null), PRESS_GLOW_MS);
    } else if (outcome === 'grow') {
      playSuccess();
      setReplay(false);
      setFresh(false);
      setPhase('right');
    } else if (outcome === 'done') {
      playSuccess();
      onStarEarned?.(simonStars(level));
      setPhase('complete');
    } else {
      // Retry or fresh sequence: a gentle wobble, no buzzer, nothing red.
      playPop();
      setWrongTap(animal);
      setReplay(outcome === 'retry');
      setFresh(outcome === 'fresh');
      setPhase('miss');
    }
  };

  const hint = phase === 'turn' ? hintAnimal(game) : null;
  const yourTurn = phase === 'turn';
  const banner = yourTurn
    ? { key: 'turn', emoji: '👆', text: t.simonLights.yourTurn }
    : phase === 'complete'
      ? { key: 'complete', emoji: '🎉', text: t.simonLights.victory }
      : phase === 'right'
        ? { key: 'right', emoji: '✨', text: t.simonLights.great }
        : { key: 'watch', emoji: '👀', text: fresh ? t.simonLights.newSequence : replay ? t.simonLights.watchAgain : t.simonLights.watch };
  const stepsDone = yourTurn ? game.input : phase === 'right' || phase === 'complete' ? game.sequence.length : 0;

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-3 w-full select-none max-w-lg mx-auto">
      {phase === 'complete' && <GameConfetti pieces={140} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.simonLights.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.simonLights.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        data-testid="simon-stage"
        data-phase={phase}
        data-length={game.sequence.length}
        data-input={game.input}
        data-sequence={game.sequence.join(',')}
        data-misses={game.missCount}
        data-speed={replay ? 'replay' : level}
        className="w-full flex flex-col items-center gap-3"
      >
        {/* Watch and your-turn look different: colour, icon and words. */}
        <div
          key={banner.key}
          data-testid="simon-banner"
          data-state={yourTurn ? 'turn' : 'watch'}
          aria-live="polite"
          className={`animate-pop-in flex items-center gap-2 px-5 py-2 rounded-full border-[3px] text-xl font-black ${
            yourTurn ? 'bg-amber-200 text-slate-900' : 'bg-sky-100 text-slate-700 border-dashed'
          }`}
          style={{ borderColor: INK }}
        >
          <span aria-hidden="true" className="text-2xl leading-none">{banner.emoji}</span>
          {banner.text}
        </div>

        <div
          data-testid="simon-steps"
          aria-hidden="true"
          className="flex flex-wrap justify-center gap-1.5 min-h-4"
        >
          {game.sequence.map((_, i) => (
            <span key={i} className={`w-4 h-4 rounded-full border-2 ${i < stepsDone ? 'bg-emerald-500' : 'bg-white'}`} style={{ borderColor: INK }} />
          ))}
        </div>

        <div
          className={`grid grid-cols-2 gap-4 w-full max-w-sm p-4 rounded-[2rem] border-4 transition-colors ${
            yourTurn ? 'bg-amber-50 border-solid' : 'bg-sky-50 border-dashed'
          }`}
          style={{ borderColor: INK }}
        >
          {ANIMALS.map((emoji, i) => {
            const color = TILE_COLORS[i];
            const isLit = (phase === 'watch' && lit === i) || (yourTurn && pressed === i) || phase === 'right' || phase === 'complete';
            const isHint = hint === i;
            return (
              <button
                key={emoji}
                data-testid="simon-animal"
                data-animal={i}
                data-lit={String(isLit)}
                data-hint={String(isHint)}
                disabled={!yourTurn}
                aria-label={emoji}
                onClick={() => tap(i)}
                className={`h-32 min-w-24 rounded-3xl border-[3px] flex items-center justify-center text-6xl leading-none touch-manipulation outline-none transition-[background-color,box-shadow] duration-150 focus-visible:ring-4 focus-visible:ring-amber-400/70 ${
                  isLit ? 'simon-lit' : ''
                } ${isHint ? 'ring-4 ring-amber-400 animate-pulse' : ''} ${wrongTap === i ? 'animate-shake' : ''} ${
                  yourTurn ? 'cursor-pointer active:translate-x-[3px] active:translate-y-[4px]' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: isLit ? color.glow : color.soft,
                  borderColor: INK,
                  boxShadow: isLit ? `0 0 0 5px ${color.soft}, 0 0 30px 10px ${color.glow}` : hardShadow(4, 5),
                  opacity: yourTurn || isLit ? 1 : 0.85,
                }}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-slate-400 font-extrabold text-xs text-center">{t.simonLights.help}</p>
    </div>
  );
}
