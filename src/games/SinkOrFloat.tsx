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
  afterWrong, allPredicted, flowFor, generateSinkFloatRound, isCorrectPrediction, resolveBatch, sinkFloatRoundKey, sinkFloatStars,
  trueResult, type DropResult, type Prediction, type SinkFloatObject,
} from './sinkOrFloatLogic';

/** One drop: the fall and bob take 1.2 s, the rest is time to see the result. */
const DROP_MS = 1600;
/** Pause on a finished round before the next one, in ms. */
const NEXT_MS = 1600;

const ZONE_EMOJI: Record<Prediction, string> = { float: '🌊', sink: '⬇️' };

interface Drop extends DropResult {
  /** Counts up for every drop in this game, so the fall, splash and shake restart each time. */
  step: number;
}

export default function SinkOrFloat() {
  const { t } = useTranslation();
  const { playPop, playSuccess, onStarEarned, challengeMode } = useGameFX();
  const [level, setLevel] = useAgeDifficulty();
  const [round, setRound] = useState(() => generateSinkFloatRound(level));
  const [roundNo, setRoundNo] = useState(0);
  const [solved, setSolved] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  /** Batch drops that have been shown so far: emoji -> was the prediction right. */
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [drop, setDrop] = useState<Drop | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const { later, cancelAll } = useLater();
  const dropCount = useRef(0);

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
    later(() => nextRound(level), NEXT_MS);
  };

  /** Easy and medium: one object drops right after its prediction. */
  const dropOne = (object: SinkFloatObject, prediction: Prediction) => {
    const correct = isCorrectPrediction(object, prediction);
    setBusy(true);
    setSelected(null);
    setDrop({ emoji: object.emoji, result: trueResult(object), correct, step: ++dropCount.current });
    later(() => {
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
    }, DROP_MS);
  };

  /** Hard: every object is predicted, then they drop one after the other. */
  const dropAll = () => {
    const results = resolveBatch(round, predictions);
    setBusy(true);
    setSelected(null);
    const run = (i: number) => {
      const r = results[i];
      setDrop({ ...r, step: ++dropCount.current });
      setMarks((m) => ({ ...m, [r.emoji]: r.correct }));
      later(() => {
        if (i + 1 < results.length) run(i + 1);
        else if (results.every((x) => x.correct)) completeRound();
        else nextRound(level);
      }, DROP_MS);
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
      setSelected(null);
    } else {
      dropOne(object, prediction);
    }
  };

  const shelf =
    flow === 'single'
      ? round.objects.filter((o) => !solved.has(o.emoji)).slice(0, 1)
      : round.objects.filter((o) => !solved.has(o.emoji));
  const canDrop = flow === 'batch' && !busy && !done && allPredicted(round, predictions);
  const zonesOff = busy || done || !selected;

  return (
    <div className="flex-1 flex flex-col items-center gap-2 p-3 w-full select-none max-w-lg mx-auto">
      {done && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.sinkOrFloat.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.sinkOrFloat.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        data-testid="sof-stage"
        data-flow={flow}
        data-phase={phase}
        data-count={round.objects.length}
        className="w-full flex flex-col items-center gap-2"
      >
        {/* Shelf: tap an object to pick it up. */}
        <div key={roundNo} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 min-h-24 animate-pop-in">
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
                className={`relative w-24 h-24 rounded-3xl border-[3px] flex items-center justify-center text-5xl leading-none touch-manipulation cursor-pointer outline-none transition-transform duration-100 focus-visible:ring-4 focus-visible:ring-amber-400/70 ${
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
                  <span aria-hidden="true" className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-white border-[3px] flex items-center justify-center text-lg" style={{ borderColor: INK }}>
                    {ZONE_EMOJI[predicted]}
                  </span>
                )}
                {mark !== undefined && (
                  <span aria-hidden="true" className="absolute -bottom-2 -left-2 w-9 h-9 rounded-full bg-white border-[3px] flex items-center justify-center text-lg" style={{ borderColor: INK }}>
                    {mark ? '✅' : '💡'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tank: the object falls in and bobs on the surface or drops to the bottom. */}
        <div
          className="relative w-full h-40 rounded-3xl border-4 overflow-hidden bg-gradient-to-b from-sky-100 to-sky-50"
          style={{ borderColor: INK }}
        >
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[58%] bg-sky-400/80 border-t-4 border-sky-500" />
          {drop && (
            <span
              key={drop.step}
              data-testid="sof-drop-object"
              data-drop-id={drop.step}
              data-result={drop.result}
              className={`absolute left-1/2 -ml-8 top-8 w-16 h-16 ${drop.correct ? '' : 'sof-shake-late'}`}
            >
              <span
                className={`block text-5xl leading-none text-center ${drop.result === 'float' ? 'sof-fall-float' : 'sof-fall-sink'}`}
              >
                {drop.emoji}
              </span>
              <span aria-hidden="true" className="sof-splash absolute left-1/2 -ml-4 top-6 text-3xl leading-none">💦</span>
            </span>
          )}
          {canDrop && (
            <div className="absolute inset-0 flex items-center justify-center">
              <KidButton data-testid="sof-drop" color="yellow" size="lg" variant="primary" aria-label={t.sinkOrFloat.dropLabel} onClick={dropAll}>
                <span className="text-4xl">💦</span>
              </KidButton>
            </div>
          )}
          {drop && (
            <p
              data-testid="sof-result"
              data-result={drop.result}
              data-correct={String(drop.correct)}
              className="absolute inset-x-0 top-1 text-center text-sm font-black text-slate-800"
            >
              {drop.result === 'float' ? t.sinkOrFloat.floated : t.sinkOrFloat.sank}{' '}
              {drop.correct ? '✅' : flow === 'batch' || afterWrong(level, challengeMode) === 'fresh' ? t.sinkOrFloat.newRound : t.sinkOrFloat.tryAgain}
            </p>
          )}
        </div>

        {/* Predict: water = float, down arrow = sink. */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm pb-1">
          <KidButton data-testid="sof-float" color="blue" size="lg" disabled={zonesOff} className={zonesOff ? 'opacity-60' : ''} onClick={() => tapZone('float')}>
            <span className="text-4xl">{ZONE_EMOJI.float}</span>
            <span className="text-lg">{t.sinkOrFloat.floatLabel}</span>
          </KidButton>
          <KidButton data-testid="sof-sink" color="yellow" size="lg" disabled={zonesOff} className={zonesOff ? 'opacity-60' : ''} onClick={() => tapZone('sink')}>
            <span className="text-4xl">{ZONE_EMOJI.sink}</span>
            <span className="text-lg">{t.sinkOrFloat.sinkLabel}</span>
          </KidButton>
        </div>
      </div>

      {done && <p data-testid="sof-victory" className="text-slate-800 font-black text-xl text-center">{t.sinkOrFloat.victory}</p>}
      <p className="text-slate-400 font-extrabold text-xs text-center">{t.sinkOrFloat.help}</p>
    </div>
  );
}
