import type { GameDifficulty } from '../types/game';

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
    <div className={`w-full flex justify-between bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 gap-1.5 select-none ${className}`}>
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
              flex-1 py-2.5 text-sm font-black rounded-xl border-b-4 transition-all duration-75 outline-none cursor-pointer select-none
              ${isActive
                ? 'bg-candy-purple text-white border-purple-700 shadow-sm translate-y-[2px]'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 active:translate-y-[1px] disabled:opacity-50'
              }
            `}
          >
            <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
              {STARS[opt]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default DifficultySelector;
