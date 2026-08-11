import { useState, useRef, useEffect, useCallback } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import { useTranslation } from '../hooks/useTranslation';
import { shuffle } from '../utils/shuffle';
import type { GameDifficulty, GameProps } from '../types/game';

interface RoundConfig {
  passengerCount: number;
  answer: number;
  delta: number; // 0 for exact count, +1 for "one more", -1 for "one less"
  targets: number[];
}

interface DifficultyConfig {
  min: number;
  max: number;
  targetCount: number;
  delta: 'none' | 'plusMinus';
  stars: number;
}

const CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: { min: 1, max: 5, targetCount: 3, delta: 'none', stars: 1 },
  medium: { min: 1, max: 10, targetCount: 5, delta: 'none', stars: 2 },
  hard: { min: 1, max: 20, targetCount: 5, delta: 'plusMinus', stars: 5 },
};

const PASSENGER_EMOJIS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦉', '🐴', '🦄'];

function generateRound(difficulty: GameDifficulty, overrideCount?: number): RoundConfig {
  const config = CONFIG[difficulty];
  const passengerCount = overrideCount ?? Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;

  let answer = passengerCount;
  let delta = 0;
  if (config.delta === 'plusMinus') {
    delta = Math.random() > 0.5 ? 1 : -1;
    answer = passengerCount + delta;
    if (answer < 1) {
      answer = 2;
      delta = 1;
    }
  }

  const targetsSet = new Set<number>();
  targetsSet.add(answer);

  while (targetsSet.size < config.targetCount) {
    const offsetRange = Math.max(config.max, 10);
    const candidate = answer + Math.floor(Math.random() * offsetRange * 2 + 1) - offsetRange;
    if (candidate >= 1 && candidate <= config.max + (config.delta === 'plusMinus' ? 1 : 0) && candidate !== answer) {
      targetsSet.add(candidate);
    }
  }

  return {
    passengerCount,
    answer,
    delta,
    targets: shuffle(Array.from(targetsSet)),
  };
}

export default function NumberTrain({ playSuccess, playError, onStarEarned }: GameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [round, setRound] = useState<RoundConfig>(() => generateRound('easy'));
  const [trainX, setTrainX] = useState(0);
  const [trainY, setTrainY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [closedStation, setClosedStation] = useState<number | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLDivElement>(null);

  const resetTrainPosition = useCallback(() => {
    setTrainX(0);
    setTrainY(0);
  }, []);

  const startNewRound = useCallback((diff: GameDifficulty) => {
    setRound(generateRound(diff));
    resetTrainPosition();
    setLocked(false);
    setClosedStation(null);
    setShowConfetti(false);
  }, [resetTrainPosition]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startNewRound(difficulty);
  }, [difficulty, startNewRound]);

  const handleDifficultyChange = (newDifficulty: GameDifficulty) => {
    setDifficulty(newDifficulty);
  };

  const getPointerPosition = (clientX: number, clientY: number) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrag = (clientX: number, clientY: number) => {
    if (locked) return;
    setIsDragging(true);
    const pos = getPointerPosition(clientX, clientY);
    setDragStart({ x: pos.x - trainX, y: pos.y - trainY });
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !stageRef.current) return;
    const pos = getPointerPosition(clientX, clientY);
    setTrainX(pos.x - dragStart.x);
    setTrainY(pos.y - dragStart.y);
  };

  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!stageRef.current || !trainRef.current) {
      resetTrainPosition();
      return;
    }

    const stageRect = stageRef.current.getBoundingClientRect();
    const trainRect = trainRef.current.getBoundingClientRect();

    // If train center is outside the stage, bring it back and play error feedback.
    const trainCenterX = trainRect.left + trainRect.width / 2;
    const trainCenterY = trainRect.top + trainRect.height / 2;
    const isOutside =
      trainCenterX < stageRect.left ||
      trainCenterX > stageRect.right ||
      trainCenterY < stageRect.top ||
      trainCenterY > stageRect.bottom;

    if (isOutside) {
      playError();
      resetTrainPosition();
      return;
    }

    // Check collision with station targets.
    const stationElements = Array.from(stageRef.current.querySelectorAll('[data-testid="number-train-station"]'));
    const trainCenter = { x: trainCenterX - stageRect.left, y: trainCenterY - stageRect.top };

    let hitStation: number | null = null;
    for (const el of stationElements) {
      const rect = el.getBoundingClientRect();
      const stationCenter = {
        x: rect.left + rect.width / 2 - stageRect.left,
        y: rect.top + rect.height / 2 - stageRect.top,
      };
      const dx = trainCenter.x - stationCenter.x;
      const dy = trainCenter.y - stationCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < Math.min(rect.width, rect.height) * 0.6) {
        hitStation = parseInt(el.getAttribute('data-value') || '0', 10);
        break;
      }
    }

    if (hitStation === round.answer) {
      setLocked(true);
      playSuccess();
      setShowConfetti(true);
      onStarEarned?.(CONFIG[difficulty].stars);
      setTimeout(() => {
        startNewRound(difficulty);
      }, 1800);
    } else if (hitStation !== null) {
      playError();
      setClosedStation(hitStation);
      setTimeout(() => {
        setClosedStation(null);
        resetTrainPosition();
      }, 800);
    } else {
      resetTrainPosition();
    }
  };

  const passengerEmoji = PASSENGER_EMOJIS[round.passengerCount % PASSENGER_EMOJIS.length];
  const passengers = Array.from({ length: round.passengerCount }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && <GameConfetti pieces={120} />}

      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.numberTrain.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.numberTrain.subtitle}</p>
      </div>

      <DifficultySelector
        selected={difficulty}
        options={['easy', 'medium', 'hard']}
        onChange={handleDifficultyChange}
        className="mt-4"
      />

      <div
        ref={stageRef}
        className="relative flex-1 w-full min-h-[320px] my-4 rounded-3xl border-4 border-slate-200 bg-gradient-to-b from-sky-100 to-emerald-50 overflow-hidden"
      >
        {round.delta !== 0 && (
          <div className="absolute top-4 left-0 right-0 text-center">
            <span
              className={`inline-block text-3xl font-black px-4 py-2 rounded-full border-4 ${
                round.delta > 0
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-rose-100 border-rose-300 text-rose-700'
              }`}
            >
              {round.delta > 0 ? t.numberTrain.oneMore : t.numberTrain.oneLess}
            </span>
          </div>
        )}

        <div
          ref={trainRef}
          data-testid="number-train"
          onMouseDown={(e) => {
            e.preventDefault();
            startDrag(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            startDrag(touch.clientX, touch.clientY);
          }}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            moveDrag(touch.clientX, touch.clientY);
          }}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchEnd={endDrag}
          style={{
            transform: `translate(${trainX}px, ${trainY}px)`,
            left: '50%',
            top: '30%',
            marginLeft: '-80px',
          }}
          className={`absolute w-40 h-28 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-75 ${
            locked ? 'pointer-events-none' : ''
          }`}
        >
          <div className="text-6xl">🚂</div>
          <div className="absolute -bottom-2 flex flex-wrap justify-center gap-0.5 max-w-[140px]">
            {passengers.map((i) => (
              <span key={i} className="text-lg">
                {passengerEmoji}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center items-end gap-3 px-4 flex-wrap">
          {round.targets.map((target) => {
            const isClosed = closedStation === target;
            return (
              <div
                key={target}
                data-testid="number-train-station"
                data-value={target}
                className={`w-24 h-24 min-w-[96px] min-h-[96px] flex items-center justify-center rounded-2xl border-4 text-4xl font-black transition-all duration-300 ${
                  isClosed
                    ? 'bg-slate-400 border-slate-500 text-white scale-95'
                    : 'bg-white border-slate-300 text-slate-700 shadow-[0_6px_0_0_#94a3b8]'
                }`}
              >
                {target}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-slate-400 font-extrabold text-xs pb-2 text-center">
        {t.numberTrain.help}
      </div>
    </div>
  );
}
