import { INK, hardShadow } from '../theme/blockTable';

interface StreakBadgeProps {
  streak: number;
  highScore: number;
  size?: 'sm' | 'md';
}

export function StreakBadge({ streak, highScore, size = 'md' }: StreakBadgeProps) {
  const pillClass =
    size === 'sm'
      ? 'px-4 py-1 text-xs'
      : 'px-4 py-1.5 text-sm';
  const pillStyle = { borderColor: INK, color: INK, boxShadow: hardShadow(2, 3) };
  return (
    <div className={`flex gap-4 items-center justify-center ${size === 'sm' ? 'pt-1' : 'pt-2'}`}>
      <span className={`bg-[#fff1c2] font-black rounded-full border-2 flex items-center gap-1.5 tabular-nums ${pillClass}`} style={pillStyle}>
        ✨ {streak}
      </span>
      <span className={`bg-[#d6f0e2] font-black rounded-full border-2 tabular-nums ${pillClass}`} style={pillStyle}>
        🏆 {highScore}
      </span>
    </div>
  );
}

export default StreakBadge;
