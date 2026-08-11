import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
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

const STATION_SIZE = 96;
const STATION_MARGIN = 12;

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
  const [locked, setLocked] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [closedStation, setClosedStation] = useState<number | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const trainRef = useRef<HTMLDivElement>(null);

  // Refs mirror latest values so the global pointer-move/up listeners always
  // see up-to-date state without needing to be re-attached every render,
  // which previously made dragging feel laggy and prone to "losing" the cursor.
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lockedRef = useRef(locked);
  const roundRef = useRef(round);
  const difficultyRef = useRef(difficulty);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useLayoutEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const updateSize = () => {
      const rect = stageEl.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageEl);
    return () => observer.disconnect();
  }, []);

  const resetTrainPosition = useCallback(() => {
    // Force a synchronous commit so the train's DOM position reflects the
    // reset immediately (important for pointerup-driven snap-back, where a
    // fast release could otherwise be measured before React re-renders).
    flushSync(() => {
      setTrainX(0);
      setTrainY(0);
    });
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

  const trainXRef = useRef(trainX);
  const trainYRef = useRef(trainY);
  useEffect(() => {
    trainXRef.current = trainX;
  }, [trainX]);
  useEffect(() => {
    trainYRef.current = trainY;
  }, [trainY]);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (lockedRef.current) return;
    draggingRef.current = true;
    setIsDragging(true);
    const pos = getPointerPosition(clientX, clientY);
    dragStartRef.current = { x: pos.x - trainXRef.current, y: pos.y - trainYRef.current };
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current || !stageRef.current) return;
    const pos = getPointerPosition(clientX, clientY);
    setTrainX(pos.x - dragStartRef.current.x);
    setTrainY(pos.y - dragStartRef.current.y);
  }, []);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const round = roundRef.current;
    const difficulty = difficultyRef.current;

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
  }, [playSuccess, playError, onStarEarned, startNewRound, resetTrainPosition]);

  // Also listen on the window as a fallback for browsers/environments where
  // pointer capture isn't available, so a fast drag never "outruns" the
  // element and gets abandoned mid-gesture.
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => moveDrag(e.clientX, e.clientY);
    const handlePointerUp = () => endDrag();

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [moveDrag, endDrag]);

  const passengerEmoji = PASSENGER_EMOJIS[round.passengerCount % PASSENGER_EMOJIS.length];
  const passengers = Array.from({ length: round.passengerCount }, (_, i) => i);

  // Orient every station in a circle around the centered train so no number
  // ever gets pushed to a second row / off-screen row where it can't be reached.
  const stationPositions = useMemo(() => {
    const { width, height } = stageSize;
    const count = round.targets.length;
    if (!width || !height || count === 0) {
      return round.targets.map(() => ({ left: 0, top: 0 }));
    }
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(
      Math.min(width, height) / 2 - STATION_SIZE / 2 - STATION_MARGIN,
      STATION_SIZE / 2 + STATION_MARGIN
    );
    return round.targets.map((_, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      return {
        left: cx + radius * Math.cos(angle) - STATION_SIZE / 2,
        top: cy + radius * Math.sin(angle) - STATION_SIZE / 2,
      };
    });
  }, [round.targets, stageSize]);

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
        className="relative flex-1 w-full min-h-[420px] my-4 rounded-3xl border-4 border-slate-200 bg-gradient-to-b from-sky-100 to-emerald-50 overflow-hidden"
      >
        {round.delta !== 0 && (
          <div className="absolute top-4 left-0 right-0 text-center z-10">
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

        {round.targets.map((target, i) => {
          const isClosed = closedStation === target;
          const pos = stationPositions[i] ?? { left: 0, top: 0 };
          return (
            <div
              key={target}
              data-testid="number-train-station"
              data-value={target}
              style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
              className={`absolute w-24 h-24 min-w-[96px] min-h-[96px] flex items-center justify-center rounded-2xl border-4 text-4xl font-black transition-all duration-300 ${
                isClosed
                  ? 'bg-slate-400 border-slate-500 text-white scale-95'
                  : 'bg-white border-slate-300 text-slate-700 shadow-[0_6px_0_0_#94a3b8]'
              }`}
            >
              {target}
            </div>
          );
        })}

        <div
          ref={trainRef}
          data-testid="number-train"
          onPointerDown={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            startDrag(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => moveDrag(e.clientX, e.clientY)}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            transform: `translate(${trainX}px, ${trainY}px)`,
            left: '50%',
            top: '50%',
            marginLeft: '-80px',
            marginTop: '-56px',
            touchAction: 'none',
          }}
          className={`absolute z-20 w-40 h-28 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing ${
            isDragging ? '' : 'transition-transform duration-75'
          } ${locked ? 'pointer-events-none' : ''}`}
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
      </div>

      <div className="text-slate-400 font-extrabold text-xs pb-2 text-center">
        {t.numberTrain.help}
      </div>
    </div>
  );
}
