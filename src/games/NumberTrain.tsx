import { useState, useEffect, useRef } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import { useTranslation } from '../hooks/useTranslation';
import type { GameDifficulty } from '../types/game';
import { useGameFX } from '../hooks/gameFXContext';
import { OPERATION_CLASSES, operationOf } from '../utils/operatorColors';
import { wrongMeansNewRound } from '../utils/difficulty';
import {
  generateNumberTrainRound,
  NUMBER_TRAIN_CONFIG,
  wagonSeats,
  type NumberTrainRound,
} from './numberTrainLogic';

const PASSENGER_EMOJIS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉', '🐴', '🦄'];

/** Time the train needs to pull out of the correct station before the next round. */
const DEPART_MS = 1500;

export default function NumberTrain() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [round, setRound] = useState<NumberTrainRound>(() => generateNumberTrainRound('easy'));
  const [roundNo, setRoundNo] = useState(0);
  const [closedStation, setClosedStation] = useState<number | null>(null);
  const [correctStation, setCorrectStation] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const startNewRound = (diff: GameDifficulty) => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setRound(generateNumberTrainRound(diff));
    setRoundNo((n) => n + 1);
    setClosedStation(null);
    setCorrectStation(null);
  };

  const handleDifficultyChange = (newDifficulty: GameDifficulty) => {
    playPop();
    setDifficulty(newDifficulty);
    startNewRound(newDifficulty);
  };

  const locked = correctStation !== null;

  const handleStationTap = (target: number) => {
    if (locked || closedStation !== null) return;
    if (target === round.answer) {
      playSuccess();
      setCorrectStation(target);
      onStarEarned?.(NUMBER_TRAIN_CONFIG[difficulty].stars);
      later(() => startNewRound(difficulty), DEPART_MS);
    } else {
      playError();
      setClosedStation(target);
      if (wrongMeansNewRound(difficulty, challengeMode)) {
        later(() => startNewRound(difficulty), 900);
      } else {
        later(() => setClosedStation(null), 700);
      }
    }
  };

  const passengerEmoji = PASSENGER_EMOJIS[round.passengerCount % PASSENGER_EMOJIS.length];
  const seats = wagonSeats(difficulty);

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-4 w-full select-none max-w-lg mx-auto">
      {locked && <GameConfetti pieces={120} />}

      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.numberTrain.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.numberTrain.subtitle}</p>
      </div>

      <DifficultySelector
        selected={difficulty}
        options={['easy', 'medium', 'hard']}
        onChange={handleDifficultyChange}
      />

      <div
        data-testid="number-train-stage"
        data-answer={round.answer}
        data-round={roundNo}
        className="relative flex-1 w-full flex flex-col justify-between gap-4 p-4 rounded-3xl border-4 border-slate-200 bg-gradient-to-b from-sky-100 to-emerald-50 overflow-hidden"
      >
        {/* Parked train: a count display, not a drag handle */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[120px]">
          <div
            key={roundNo}
            data-testid="number-train"
            data-passengers={round.passengerCount}
            className={`flex items-end transition-transform ease-in duration-1000 ${
              locked ? '-translate-x-[150vw]' : 'animate-pop-in'
            }`}
          >
            <span aria-hidden="true" className="text-6xl leading-none -mr-1 mb-1">🚂</span>
            <div className="relative flex flex-col items-center">
              {round.delta !== 0 && (
                <span
                  data-testid="number-train-delta"
                  className={`absolute -top-5 -right-2 z-10 flex items-center text-2xl font-black px-3 py-0.5 rounded-full border-4 shadow-sm ${OPERATION_CLASSES[operationOf(round.delta)]}`}
                >
                  {round.delta > 0 ? t.numberTrain.oneMore : t.numberTrain.oneLess}
                  <span aria-hidden="true" className="ml-1 text-xl">{passengerEmoji}</span>
                </span>
              )}
              <div className="grid grid-cols-5 gap-1 p-2 rounded-2xl bg-candy-orange border-4 border-orange-600 shadow-[0_4px_0_0_#ea580c]">
                {Array.from({ length: seats }, (_, seat) => (
                  <span
                    key={seat}
                    data-testid={seat < round.passengerCount ? 'number-train-passenger' : undefined}
                    className="w-9 h-9 rounded-lg bg-sky-100 border-2 border-orange-200 flex items-center justify-center text-2xl leading-none"
                  >
                    {seat < round.passengerCount ? passengerEmoji : ''}
                  </span>
                ))}
              </div>
              <div aria-hidden="true" className="w-full flex justify-around px-4 -mt-1">
                <span className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-400" />
                <span className="w-5 h-5 rounded-full bg-slate-700 border-2 border-slate-400" />
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="w-full h-1.5 rounded-full bg-slate-400/60" />
        </div>

        {/* Stations: tap the number to send the train there */}
        <div className={`grid gap-3 ${round.targets.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {round.targets.map((target) => {
            const isClosed = closedStation === target;
            const isCorrect = correctStation === target;
            return (
              <button
                key={target}
                type="button"
                data-testid="number-train-station"
                data-value={target}
                disabled={locked}
                onClick={() => handleStationTap(target)}
                className={`min-h-[96px] min-w-[96px] flex flex-col items-stretch overflow-hidden rounded-2xl border-4 transition-colors duration-150 outline-none cursor-pointer touch-manipulation active:translate-y-[4px] ${
                  isCorrect
                    ? 'bg-emerald-400 border-emerald-500 text-white'
                    : isClosed
                    ? 'bg-slate-300 border-slate-400 text-slate-600 animate-shake'
                    : 'bg-white border-slate-300 text-slate-700 shadow-[0_6px_0_0_#94a3b8]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`py-0.5 text-2xl leading-none ${
                    isCorrect ? 'bg-emerald-600' : isClosed ? 'bg-slate-400' : 'bg-slate-200'
                  }`}
                >
                  🚉
                </span>
                <span className="flex-1 flex items-center justify-center text-5xl font-black tabular-nums">
                  {target}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-slate-400 font-extrabold text-xs text-center">
        {t.numberTrain.help}
      </div>
    </div>
  );
}
