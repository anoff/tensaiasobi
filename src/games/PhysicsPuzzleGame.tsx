import { useState, useEffect, useCallback } from 'react';
import Confetti from 'react-confetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';

interface Weight {
  id: number;
  emoji: string;
  mass: number;
  side: 'left' | 'right' | 'tray';
}

interface PhysicsPuzzleGameProps {
  playPop: () => void;
  playSuccess: () => void;
  onStarEarned?: (amount: number) => void;
}

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
  const shuffled = [...WEIGHT_EMOJIS].sort(() => Math.random() - 0.5);

  // Place a fixed weight on one side and a slightly different one on the other.
  const leftBase = shuffled[0];
  const rightBase = { ...shuffled[1], mass: shuffled[1].mass + settings.targetDifference };

  let nextId = 1;
  newWeights.push({ id: nextId++, emoji: leftBase.emoji, mass: leftBase.mass, side: 'left' });
  newWeights.push({ id: nextId++, emoji: rightBase.emoji, mass: rightBase.mass, side: 'right' });

  // Add tray weights that can be used to balance the scale.
  for (let i = 0; i < settings.trayCount; i++) {
    const item = shuffled[(i + 2) % shuffled.length];
    newWeights.push({ id: nextId++, emoji: item.emoji, mass: item.mass, side: 'tray' });
  }

  return newWeights;
}

export function PhysicsPuzzleGame({ playPop, playSuccess, onStarEarned }: PhysicsPuzzleGameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [weights, setWeights] = useState<Weight[]>(() => buildWeights(difficulty));
  const [showConfetti, setShowConfetti] = useState(false);
  const [solved, setSolved] = useState(false);
  const [selectedWeightId, setSelectedWeightId] = useState<number | null>(null);
  const settings = getDifficultySettings(difficulty);

  const leftMass = weights.filter((w) => w.side === 'left').reduce((sum, w) => sum + w.mass, 0);
  const rightMass = weights.filter((w) => w.side === 'right').reduce((sum, w) => sum + w.mass, 0);
  const tilt = Math.max(-20, Math.min(20, (leftMass - rightMass) * 3));

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
      // Move selected tray weight to this side
      setWeights((prev) =>
        prev.map((w) => (w.id === selectedWeightId ? { ...w, side: weight.side } : w))
      );
      playPop();
      setSelectedWeightId(null);
      return;
    }

    // Clicking a placed weight returns it to the tray
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

  const handleDifficultyChange = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const trayWeights = weights.filter((w) => w.side === 'tray');
  const leftWeights = weights.filter((w) => w.side === 'left');
  const rightWeights = weights.filter((w) => w.side === 'right');

  const leftLabel = `${leftMass}`;
  const rightLabel = `${rightMass}`;

  return (
    <div className="flex-1 flex flex-col items-center w-full h-full select-none max-w-lg mx-auto px-2 py-2">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={120}
          recycle={false}
        />
      )}

      <div className="text-center space-y-1 mb-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          {t.physicsGame.title}
        </h2>
        <p className="text-slate-500 font-extrabold text-xs">{t.physicsGame.subtitle}</p>
      </div>

      <DifficultySelector
        selected={difficulty}
        options={['easy', 'medium', 'hard']}
        onChange={handleDifficultyChange}
        className="mb-3"
      />

      {/* Seesaw */}
      <div className="relative w-full flex-1 flex flex-col items-center justify-center min-h-[240px]">
        {/* Left pan label */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
          {leftLabel}
        </div>
        {/* Right pan label */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
          {rightLabel}
        </div>

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
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 flex flex-wrap items-center justify-center gap-1 p-2 hover:bg-amber-50 transition-colors"
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
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 flex flex-wrap items-center justify-center gap-1 p-2 hover:bg-amber-50 transition-colors"
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
      </div>

      {/* Weight tray */}
      <div className="w-full bg-slate-100 rounded-2xl p-3 mb-3">
        <p className="text-center text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">
          {t.physicsGame.tray}
        </p>
        <div className="flex flex-wrap justify-center gap-2 min-h-[48px]">
          {trayWeights.map((w) => (
            <button
              key={w.id}
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
