import type { GameDifficulty } from '../types/game';
import { BUTTER, INK, hardShadow } from '../theme/blockTable';

interface DifficultySelectorProps {
  selected: GameDifficulty;
  options: GameDifficulty[];
  onChange: (value: GameDifficulty) => void;
  disabled?: boolean;
  className?: string;
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
}: DifficultySelectorProps) {
  return (
    <div
      className={`w-full flex justify-between bg-[#fff8ec] p-1.5 rounded-2xl border-[3px] gap-1.5 select-none ${className}`}
      style={{ borderColor: INK, boxShadow: hardShadow(3, 4) }}
    >
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <button
            key={opt}
            data-testid={`difficulty-${opt}`}
            disabled={disabled}
            onClick={() => {
              if (!isActive) onChange(opt);
            }}
            className={`
              flex-1 py-2.5 text-sm font-black rounded-xl border-2 transition-all duration-75 outline-none cursor-pointer select-none
              focus-visible:ring-4 focus-visible:ring-amber-400/70
              ${isActive ? '' : 'border-transparent opacity-60 hover:opacity-100 disabled:opacity-40'}
            `}
            style={isActive ? { backgroundColor: BUTTER, borderColor: INK, boxShadow: hardShadow(2, 2) } : undefined}
          >
            {STARS[opt]}
          </button>
        );
      })}
    </div>
  );
}

export default DifficultySelector;
