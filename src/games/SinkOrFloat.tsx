import { useRef, useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { useGameFX } from '../hooks/gameFXContext';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { useLater } from '../hooks/useLater';
import { useTranslation } from '../hooks/useTranslation';
import { freshRound } from '../utils/freshRound';
import { INK, hardShadow } from '../theme/blockTable';
import type { GameDifficulty } from '../types/game';
import {
  afterBatch, afterWrong, flowFor, generateSinkFloatRound, isCorrectPrediction, resolveBatch, sinkFloatRoundKey, sinkFloatStars,
  trueResult, type DropResult, type Prediction, type SinkFloatObject,
} from './sinkOrFloatLogic';

/**
 * One drop: the fall and bob take 1.2 s and the splash ends at 1.3 s (the CSS in index.css). The result
 * badge appears only then, on the splash's `animationend`, and is held before the next step.
 */
const ANIM_MS = 1300;
/** The badge stays this long on a single or medium drop: 1300 + 1200 = 2500 ms per drop. */
const HOLD_MS = 1200;
/** Hard: shorter hold between the batch drops, the full hold after the last one. */
const HOLD_BETWEEN_MS = 700;
/** If an `animationend` never arrives (animations switched off), the badge still shows after this. */
const SETTLE_FALLBACK_MS = ANIM_MS + 600;
/** Pause on a finished round before the next one, in ms. */
const NEXT_MS = 1600;

/** Big buttons follow the shared tap-target size (96px, 72px on the smallest phones). */
const FIT_BUTTON = '!min-h-[var(--game-tile)] !min-w-[var(--game-tile)] short:!py-2';

const ZONE_EMOJI: Record<Prediction, string> = { float: '🌊', sink: '⬇️' };
/** The guess was right / not this time (a hint, never red). */
const GUESS_EMOJI = { right: '✅', wrong: '💡' } as const;

interface Drop extends DropResult {
  /** Counts up for every drop in this game, so the fall, splash and shake restart each time. */
  step: number;
}

export default function SinkOrFloat() {
  const { t } = useTranslation();
  const { playPop, playSuccess, onStarEarned, onRoundComplete, challengeMode } = useGameFX();
  const [level, setLevel] = useAgeDifficulty();
  const [round, setRound] = useState(() => generateSinkFloatRound(level));
  const [roundNo, setRoundNo] = useState(0);
  const [solved, setSolved] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  /** Batch drops that have been shown so far: emoji -> was the prediction right. */
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [drop, setDrop] = useState<Drop | null>(null);
  /** Step of the drop whose result badge is showing (the badge waits for the animation to finish). */
  const [shownStep, setShownStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { later, cancelAll } = useLater();
  const dropCount = useRef(0);
  /** The running drop: what to do once its animation is over (badge, marks, then the next step). */
  const running = useRef<{ step: number; settled: boolean; reveal?: () => void; hold: number; after: () => void } | null>(null);

  const flow = flowFor(level);
  const phase = done ? 'success' : busy ? 'dropping' : 'playing';

  const nextRound = (lvl: GameDifficulty = level) => {
    cancelAll();
    setRound((prev) => freshRound(() => generateSinkFloatRound(lvl), prev, sinkFloatRoundKey));
    setRoundNo((n) => n + 1);
    setSolved(new Set());
    setSelected(null);
    setPredictions({});
    setMarks({});
    setDrop(null);
    setShownStep(0);
    running.current = null;
    setBusy(false);
    setDone(false);
  };

  const changeLevel = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
    nextRound(lvl);
  };

  const completeRound = () => {
    setBusy(false);
    setDone(true);
    playSuccess();
    onStarEarned?.(sinkFloatStars(level));
    onRoundComplete?.();
    later(() => nextRound(level), NEXT_MS);
  };

  /** The animation is over: show the badge (and shelf mark), hold it, then carry on. Runs once per drop. */
  const settle = (step: number) => {
    const cur = running.current;
    if (!cur || cur.step !== step || cur.settled) return;
    cur.settled = true;
    setShownStep(step);
    cur.reveal?.();
    later(() => {
      setShownStep(0);
      cur.after();
    }, cur.hold);
  };

  /** Start one drop; its result shows when the splash animation ends, with a timer only as a safety net. */
  const startDrop = (result: DropResult, hold: number, after: () => void, reveal?: () => void) => {
    const step = ++dropCount.current;
    running.current = { step, settled: false, reveal, hold, after };
    setDrop({ ...result, step });
    later(() => settle(step), SETTLE_FALLBACK_MS);
  };

  /** Easy and medium: one object drops right after its prediction. */
  const dropOne = (object: SinkFloatObject, prediction: Prediction) => {
    if (busy || running.current) return;
    const correct = isCorrectPrediction(object, prediction);
    setBusy(true);
    setSelected(null);
    startDrop({ emoji: object.emoji, result: trueResult(object), correct }, HOLD_MS, () => {
      running.current = null;
      if (correct) {
        const next = new Set(solved).add(object.emoji);
        setSolved(next);
        if (next.size === round.objects.length) completeRound();
        else setBusy(false);
      } else if (afterWrong(level, challengeMode) === 'fresh') {
        nextRound(level);
      } else {
        // Gentle retry: the object is back on the shelf for another go.
        setBusy(false);
      }
    });
  };

  /** Hard: every object is predicted, then they drop one after the other. */
  const dropAll = () => {
    if (busy || running.current) return;
    // Only the objects still on the shelf drop; right guesses from an earlier try stay solved.
    const results = resolveBatch(round, predictions).filter((r) => !solved.has(r.emoji));
    setBusy(true);
    setSelected(null);
    const run = (i: number) => {
      const r = results[i];
      const last = i + 1 >= results.length;
      startDrop(
        r,
        last ? HOLD_MS : HOLD_BETWEEN_MS,
        () => {
          running.current = null;
          if (!last) return run(i + 1);
          const outcome = afterBatch(results, challengeMode);
          if (outcome === 'complete') completeRound();
          else if (outcome === 'fresh') nextRound(level);
          else {
            // Friendly retry: keep the right ones solved, put the missed ones back with their 💡 hint.
            const missed = results.filter((x) => !x.correct).map((x) => x.emoji);
            setSolved((prev) => new Set([...prev, ...results.filter((x) => x.correct).map((x) => x.emoji)]));
            setPredictions((p) => Object.fromEntries(Object.entries(p).filter(([emoji]) => !missed.includes(emoji))));
            setDrop(null);
            setBusy(false);
          }
        },
        () => setMarks((m) => ({ ...m, [r.emoji]: r.correct })),
      );
    };
    run(0);
  };

  const tapObject = (emoji: string) => {
    if (busy || done) return;
    playPop();
    setSelected((cur) => (cur === emoji ? null : emoji));
  };

  const tapZone = (prediction: Prediction) => {
    if (busy || done || !selected) return;
    const object = round.objects.find((o) => o.emoji === selected);
    if (!object) return;
    playPop();
    if (flow === 'batch') {
      setPredictions((p) => ({ ...p, [object.emoji]: prediction }));
      setMarks((m) => {
        if (!(object.emoji in m)) return m;
        const rest = { ...m };
        delete rest[object.emoji];
        return rest;
      });
      setSelected(null);
    } else {
      dropOne(object, prediction);
    }
  };

  const shelf =
    flow === 'single'
      ? round.objects.filter((o) => !solved.has(o.emoji)).slice(0, 1)
      : round.objects.filter((o) => !solved.has(o.emoji));
  const canDrop = flow === 'batch' && !busy && !done && shelf.length > 0 && shelf.every((o) => predictions[o.emoji] !== undefined);
  const zonesOff = busy || done || !selected;

  return (
    <div className="flex-1 flex flex-col items-center gap-2 p-3 short:py-1 w-full select-none max-w-lg mx-auto">
      {done && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl short:text-2xl font-black text-slate-800 tracking-tight">{t.sinkOrFloat.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm short:hidden">{t.sinkOrFloat.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        data-testid="sof-stage"
        data-flow={flow}
        data-phase={phase}
        data-count={round.objects.length}
        className="w-full flex flex-col items-center gap-2 tiny:gap-1.5"
      >
        {/* Shelf: tap an object to pick it up. */}
        <div key={roundNo} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 tiny:gap-x-2 tiny:gap-y-1.5 min-h-[var(--game-tile)] animate-pop-in">
          {shelf.map((o) => {
            const isSelected = selected === o.emoji;
            const predicted = predictions[o.emoji];
            const mark = marks[o.emoji];
            return (
              <button
                key={o.emoji}
                data-testid="sof-object"
                data-emoji={o.emoji}
                data-floats={String(o.floats)}
                data-selected={String(isSelected)}
                data-prediction={predicted ?? ''}
                disabled={busy || done}
                onClick={() => tapObject(o.emoji)}
                className={`relative w-[var(--game-tile)] h-[var(--game-tile)] rounded-3xl border-[3px] flex items-center justify-center text-5xl tiny:text-4xl leading-none touch-manipulation cursor-pointer outline-none transition-transform duration-100 focus-visible:ring-4 focus-visible:ring-amber-400/70 ${
                  isSelected ? 'scale-110 ring-4 ring-amber-400' : 'active:translate-x-[3px] active:translate-y-[4px]'
                }`}
                style={{
                  backgroundColor: isSelected ? '#fff3c4' : '#fff8ec',
                  borderColor: INK,
                  boxShadow: isSelected ? hardShadow(2, 3) : hardShadow(4, 5),
                }}
              >
                {o.emoji}
                {predicted && (
                  <span aria-hidden="true" className="absolute -top-2 -right-2 w-9 h-9 tiny:w-7 tiny:h-7 rounded-full bg-white border-[3px] flex items-center justify-center text-lg tiny:text-sm" style={{ borderColor: INK }}>
                    {ZONE_EMOJI[predicted]}
                  </span>
                )}
                {mark !== undefined && (
                  <span aria-hidden="true" className="absolute -bottom-2 -left-2 w-9 h-9 tiny:w-7 tiny:h-7 rounded-full bg-white border-[3px] flex items-center justify-center text-lg tiny:text-sm" style={{ borderColor: INK }}>
                    {mark ? '✅' : '💡'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tank: the object falls in and bobs on the surface or drops to the bottom. */}
        <div
          data-testid="sof-tank"
          className="relative w-full rounded-3xl border-4 overflow-hidden bg-gradient-to-b from-sky-100 to-sky-50"
          style={{ borderColor: INK, height: 'calc(10rem * var(--game-scale))' }}
        >
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[58%] bg-sky-400/80 border-t-4 border-sky-500" />
          {drop && (
            <span
              key={drop.step}
              data-testid="sof-drop-object"
              data-drop-id={drop.step}
              data-result={drop.result}
              className={`absolute left-1/2 ${drop.correct ? '' : 'sof-shake-late'}`}
              style={{ width: 'calc(4rem * var(--game-scale))', height: 'calc(4rem * var(--game-scale))', marginLeft: 'calc(-2rem * var(--game-scale))', top: 'calc(2rem * var(--game-scale))' }}
            >
              <span
                style={{ fontSize: 'calc(3rem * var(--game-scale))' }}
                className={`block leading-none text-center ${drop.result === 'float' ? 'sof-fall-float' : 'sof-fall-sink'}`}
              >
                {drop.emoji}
              </span>
              <span
                aria-hidden="true"
                onAnimationEnd={() => settle(drop.step)}
                className="sof-splash absolute left-1/2 -ml-4 top-6 tiny:top-4 text-3xl tiny:text-2xl leading-none"
              >
                💦
              </span>
            </span>
          )}
          {canDrop && (
            <div className="absolute inset-0 flex items-center justify-center">
              <KidButton data-testid="sof-drop" color="yellow" size="lg" variant="primary" aria-label={t.sinkOrFloat.dropLabel} className={FIT_BUTTON} onClick={dropAll}>
                <span className="text-4xl tiny:text-3xl">💦</span>
              </KidButton>
            </div>
          )}
          {/* Result badge: what happened (🌊 / ⬇️) next to the guess (✅ / 💡). Icons only, after the animation.
              It sits in the top-right corner: the objects fall, float and sink in the middle column, so it never covers them. */}
          {drop && shownStep === drop.step && (
            <div
              data-testid="sof-badge"
              data-result={drop.result}
              data-correct={String(drop.correct)}
              aria-hidden="true"
              className="animate-pop-in absolute top-2 right-2 tiny:top-1.5 tiny:right-1.5 pointer-events-none flex items-center justify-center gap-1 rounded-full bg-white border-[3px] px-3 leading-none"
              style={{ borderColor: INK, boxShadow: hardShadow(2, 3), height: 'calc(3.5rem * var(--game-scale))', minHeight: '2.5rem' }}
            >
              <span style={{ fontSize: 'max(1.25rem, calc(1.75rem * var(--game-scale)))' }}>{ZONE_EMOJI[drop.result]}</span>
              <span style={{ fontSize: 'max(1.25rem, calc(1.75rem * var(--game-scale)))' }}>{drop.correct ? GUESS_EMOJI.right : GUESS_EMOJI.wrong}</span>
            </div>
          )}
          {/* The spoken result for screen readers: visually hidden, announced only once the badge shows. */}
          <div aria-live="polite" className="sr-only">
            {drop && shownStep === drop.step && (
              <p data-testid="sof-result" data-result={drop.result} data-correct={String(drop.correct)}>
                {drop.result === 'float' ? t.sinkOrFloat.floated : t.sinkOrFloat.sank}{' '}
                {drop.correct ? '✅' : afterWrong(level, challengeMode) === 'fresh' && (flow !== 'batch' || challengeMode) ? t.sinkOrFloat.newRound : t.sinkOrFloat.tryAgain}
              </p>
            )}
          </div>
        </div>

        {/* Predict: water = float, down arrow = sink. */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm pb-1">
          <KidButton data-testid="sof-float" color="blue" size="lg" disabled={zonesOff} className={`${FIT_BUTTON} ${zonesOff ? 'opacity-60' : ''}`} onClick={() => tapZone('float')}>
            <span className="text-4xl tiny:text-3xl">{ZONE_EMOJI.float}</span>
            <span className="text-lg tiny:text-base">{t.sinkOrFloat.floatLabel}</span>
          </KidButton>
          <KidButton data-testid="sof-sink" color="yellow" size="lg" disabled={zonesOff} className={`${FIT_BUTTON} ${zonesOff ? 'opacity-60' : ''}`} onClick={() => tapZone('sink')}>
            <span className="text-4xl tiny:text-3xl">{ZONE_EMOJI.sink}</span>
            <span className="text-lg tiny:text-base">{t.sinkOrFloat.sinkLabel}</span>
          </KidButton>
        </div>
      </div>

      {done && <p data-testid="sof-victory" className="text-slate-800 font-black text-xl text-center">{t.sinkOrFloat.victory}</p>}
      <p className="text-slate-400 font-extrabold text-xs text-center short:hidden">{t.sinkOrFloat.help}</p>
    </div>
  );
}
