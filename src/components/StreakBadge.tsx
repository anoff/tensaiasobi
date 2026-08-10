interface StreakBadgeProps {
  streak: number;
  highScore: number;
  size?: 'sm' | 'md';
}

export function StreakBadge({ streak, highScore, size = 'md' }: StreakBadgeProps) {
  const pillClass =
    size === 'sm'
      ? 'px-4 py-1 text-xs'
      : 'px-4 py-1.5 text-sm animate-pulse';
  return (
    <div className={`flex gap-4 items-center justify-center ${size === 'sm' ? 'pt-1' : 'pt-2'}`}>
      <span className={`bg-amber-100 text-amber-600 font-extrabold rounded-full border-2 border-amber-300 shadow-sm flex items-center gap-1.5 ${pillClass}`}>
        ✨ {streak}
      </span>
      <span className={`bg-indigo-100 text-indigo-600 font-extrabold rounded-full border-2 border-indigo-300 shadow-sm ${pillClass}`}>
        🏆 {highScore}
      </span>
    </div>
  );
}

export default StreakBadge;
