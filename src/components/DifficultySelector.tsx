import { useContext } from 'react';
import type { GameDifficulty } from '../types/game';
import { GameFXContext } from '../hooks/gameFXContext';
import { difficultyForAge } from '../utils/difficulty';
import { BUTTER, INK, hardShadow } from '../theme/blockTable';

interface DifficultySelectorProps {
  selected: GameDifficulty;
  options: GameDifficulty[];
  onChange: (value: GameDifficulty) => void;
  disabled?: boolean;
  className?: string;
  /** `paper` = ink-on-paper track that sits on a NotebookSheet (school games). */
  variant?: 'candy' | 'paper';
}

const STARS: Record<GameDifficulty, string> = {
  easy: '⭐',
  medium: '⭐⭐',
  hard: '⭐⭐⭐',
};

export function DifficultySelector({
  selected,
  options,
  onChange,
  disabled = false,
  className = '',
  variant = 'candy',
}: DifficultySelectorProps) {
  const paper = variant === 'paper';
  // The level that doesn't fit the home age switch stays visible but locked.
  const band = useContext(GameFXContext)?.ageBand;
  const locked = band ? difficultyForAge(band).locked : null;
  const idleClass = paper
    ? 'bg-transparent border-2 border-transparent opacity-45 hover:opacity-70 disabled:opacity-30'
    : 'border-transparent opacity-60 hover:opacity-100 disabled:opacity-40';

  return (
    <div
      className={`w-full flex justify-between p-1.5 rounded-2xl gap-1.5 select-none ${
        paper ? 'bg-paper border-2 border-paper-edge' : 'bg-[#fff8ec] border-[3px]'
      } ${className}`}
      style={paper ? undefined : { borderColor: INK, boxShadow: hardShadow(3, 4) }}
    >
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <button
            key={opt}
            data-testid={`difficulty-${opt}`}
            disabled={disabled || opt === locked}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) onChange(opt);
            }}
            className={`
              flex-1 py-2.5 text-sm font-black rounded-xl border-2 transition-all duration-75 outline-none cursor-pointer select-none
              focus-visible:ring-4 focus-visible:ring-amber-400/70
              ${opt === locked ? 'cursor-not-allowed' : ''}
              ${isActive ? (paper ? 'bg-white text-ink border-ink/70 shadow-sm' : '') : idleClass}
            `}
            style={isActive && !paper ? { backgroundColor: BUTTER, borderColor: INK, boxShadow: hardShadow(2, 2) } : undefined}
          >
            <span className={opt === locked ? 'grayscale opacity-50' : undefined}>{STARS[opt]}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DifficultySelector;
