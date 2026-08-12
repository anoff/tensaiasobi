import { useState, useEffect, useCallback } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { shuffle } from '../utils/shuffle';

interface Weight {
  id: number;
  emoji: string;
  mass: number;
  side: 'left' | 'right' | 'tray';
}

type PhysicsPuzzleGameProps = Omit<GameProps, 'playError'>;

const WEIGHT_EMOJIS = [
  { emoji: '🍎', mass: 1 },
  { emoji: '🍊', mass: 1 },
  { emoji: '🍌', mass: 2 },
  { emoji: '🧸', mass: 2 },
  { emoji: '🧱', mass: 3 },
  { emoji: '📘', mass: 3 },
  { emoji: '🪨', mass: 4 },
];

function getDifficultySettings(diff: GameDifficulty) {
  switch (diff) {
    case 'easy':
      return { targetDifference: 1, trayCount: 3, starMultiplier: 1 };
    case 'medium':
      return { targetDifference: 2, trayCount: 4, starMultiplier: 2 };
    case 'hard':
      return { targetDifference: 3, trayCount: 5, starMultiplier: 3 };
    default:
      return { targetDifference: 2, trayCount: 4, starMultiplier: 2 };
  }
}

function buildWeights(diff: GameDifficulty): Weight[] {
  const settings = getDifficultySettings(diff);
  const newWeights: Weight[] = [];
  const weightedPairs = WEIGHT_EMOJIS.flatMap((first, firstIndex) =>
    WEIGHT_EMOJIS
      .slice(firstIndex + 1)
      .filter((second) => Math.abs(first.mass - second.mass) === settings.targetDifference)
      .map((second) => [first, second] as const)
  );
  const [baseA, baseB] = shuffle(weightedPairs)[0] ?? [WEIGHT_EMOJIS[0], WEIGHT_EMOJIS[2]];
  const [leftBase, rightBase] = Math.random() < 0.5 ? [baseA, baseB] : [baseB, baseA];
  const trayPool = shuffle(WEIGHT_EMOJIS);

  let nextId = 1;
  newWeights.push({ id: nextId++, emoji: leftBase.emoji, mass: leftBase.mass, side: 'left' });
  newWeights.push({ id: nextId++, emoji: rightBase.emoji, mass: rightBase.mass, side: 'right' });

  // Add tray weights that can be used to balance the scale.
  for (let i = 0; i < settings.trayCount; i++) {
    const item = trayPool[i % trayPool.length];
    newWeights.push({ id: nextId++, emoji: item.emoji, mass: item.mass, side: 'tray' });
  }

  return newWeights;
}

export function PhysicsPuzzleGame({ playPop, playSuccess, onStarEarned }: PhysicsPuzzleGameProps) {
  const { t } = useTranslation();
  const difficulty: GameDifficulty = 'hard';
  const [weights, setWeights] = useState<Weight[]>(() => buildWeights(difficulty));
  const [showConfetti, setShowConfetti] = useState(false);
  const [solved, setSolved] = useState(false);
  const [selectedWeightId, setSelectedWeightId] = useState<number | null>(null);
  const settings = getDifficultySettings(difficulty);

  const leftMass = weights.filter((w) => w.side === 'left').reduce((sum, w) => sum + w.mass, 0);
  const rightMass = weights.filter((w) => w.side === 'right').reduce((sum, w) => sum + w.mass, 0);
  const tilt = Math.max(-20, Math.min(20, (rightMass - leftMass) * 3));

  useEffect(() => {
    if (solved) return;
    if (leftMass > 0 && rightMass > 0 && leftMass === rightMass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSolved(true);
      setShowConfetti(true);
      playSuccess();
      onStarEarned?.(settings.starMultiplier);
      setTimeout(() => setShowConfetti(false), 1500);
    }
  }, [leftMass, rightMass, solved, playSuccess, onStarEarned, settings.starMultiplier]);

  const initGame = useCallback(() => {
    setWeights(buildWeights(difficulty));
    setShowConfetti(false);
    setSolved(false);
    setSelectedWeightId(null);
  }, [difficulty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame();
  }, [initGame]);

  const handleWeightClick = (weight: Weight) => {
    if (solved) return;

    if (weight.side === 'tray') {
      playPop();
      setSelectedWeightId(weight.id);
      return;
    }

    if (selectedWeightId !== null) {

      setWeights((prev) =>
        prev.map((w) => (w.id === selectedWeightId ? { ...w, side: weight.side } : w))
      );
      playPop();
      setSelectedWeightId(null);
      return;
    }


    setWeights((prev) => prev.map((w) => (w.id === weight.id ? { ...w, side: 'tray' } : w)));
    playPop();
  };

  const handleSideClick = (side: 'left' | 'right') => {
    if (solved || selectedWeightId === null) return;
    setWeights((prev) =>
      prev.map((w) => (w.id === selectedWeightId ? { ...w, side } : w))
    );
    playPop();
    setSelectedWeightId(null);
  };

  const trayWeights = weights.filter((w) => w.side === 'tray');
  const leftWeights = weights.filter((w) => w.side === 'left');
  const rightWeights = weights.filter((w) => w.side === 'right');

  return (
    <div className="flex-1 flex flex-col items-center w-full h-full select-none max-w-lg mx-auto px-2 py-2">
      {showConfetti && (
        <GameConfetti pieces={120} />
      )}

      <div className="text-center space-y-1 mb-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          {t.physicsGame.title}
        </h2>
        <p className="text-slate-500 font-extrabold text-xs">{t.physicsGame.subtitle}</p>
      </div>

      {/* Seesaw */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-center min-h-[240px]">
        {/* Pivot triangle */}
        <div className="absolute bottom-8 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[36px] border-b-amber-700" />

        {/* Beam */}
        <div
          className="relative w-11/12 h-6 bg-amber-300 rounded-full border-4 border-amber-400 transition-transform duration-500 ease-out"
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          {/* Left pan */}
          <button
            type="button"
            data-testid="physics-pan-left"
            onClick={() => handleSideClick('left')}
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 grid grid-cols-3 items-center justify-items-center gap-0.5 p-2 hover:bg-amber-50 transition-colors"
          >
            {leftWeights.map((w) => (
              <span key={w.id} onClick={(e) => { e.stopPropagation(); handleWeightClick(w); }} className="text-2xl cursor-pointer">
                {w.emoji}
              </span>
            ))}
          </button>

          {/* Right pan */}
          <button
            type="button"
            data-testid="physics-pan-right"
            onClick={() => handleSideClick('right')}
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 grid grid-cols-3 items-center justify-items-center gap-0.5 p-2 hover:bg-amber-50 transition-colors"
          >
            {rightWeights.map((w) => (
              <span key={w.id} onClick={(e) => { e.stopPropagation(); handleWeightClick(w); }} className="text-2xl cursor-pointer">
                {w.emoji}
              </span>
            ))}
          </button>
        </div>

        {solved && (
          <div className="mt-4 text-center">
            <span className="text-4xl">⚖️</span>
            <p className="text-lg font-black text-emerald-600">{t.physicsGame.victory}</p>
          </div>
        )}

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 flex items-center justify-between px-2">
          <div className="px-3 py-1 rounded-full bg-white border-2 border-slate-200 shadow-sm text-sm font-black text-slate-700">
            <span data-testid="physics-left-mass">⬅️ {leftMass}</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-white border-2 border-slate-200 shadow-sm text-sm font-black text-slate-700">
            <span data-testid="physics-right-mass">➡️ {rightMass}</span>
          </div>
        </div>
      </div>

      {/* Weight tray */}
      <div className="w-full bg-slate-100 rounded-2xl p-3 mb-3">
        <p className="text-center text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">
          {t.physicsGame.tray}
        </p>
        <div className="flex flex-wrap justify-center gap-2 min-h-[48px]">
          {trayWeights.map((w) => (
            <div key={w.id} className="flex flex-col items-center gap-1">
              {selectedWeightId === w.id && (
                <span className="text-xs font-black text-slate-600 leading-none">{w.mass}</span>
              )}
              <button
                type="button"
                data-testid="physics-tray-weight"
                onClick={() => handleWeightClick(w)}
                className={`
                  w-12 h-12 text-2xl rounded-xl border-2 flex items-center justify-center
                  transition-all duration-75
                  ${selectedWeightId === w.id
                    ? 'bg-yellow-100 border-yellow-400 scale-110 shadow-md'
                    : 'bg-white border-slate-200 hover:bg-slate-50 active:scale-95'
                  }
                `}
              >
                {w.emoji}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 w-full">
        <KidButton color="green" size="md" data-testid="physics-reset" onClick={() => { playPop(); initGame(); }}>
          {t.common.reset}
        </KidButton>
        <p className="flex-1 text-center text-xs font-bold text-slate-400 self-center">
          {t.physicsGame.help}
        </p>
      </div>
    </div>
  );
}

export default PhysicsPuzzleGame;
