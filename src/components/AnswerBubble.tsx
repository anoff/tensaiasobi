import type { ReactNode } from 'react';

interface AnswerBubbleProps {
  children: ReactNode;
  selected: boolean;
  correct: boolean | null;
  shake?: boolean;
  disabled: boolean;
  onClick: () => void;
  testId?: string;
  dataAttrs?: Record<string, string>;
  className?: string;
}

export default function AnswerBubble({
  children,
  selected,
  correct,
  shake = false,
  disabled,
  onClick,
  testId,
  dataAttrs,
  className = '',
}: AnswerBubbleProps) {
  const isWrong = (selected && correct === false) || shake;

  let bubbleColorClass =
    'from-sky-300/40 via-sky-400/70 to-sky-600/90 shadow-[0_10px_20px_rgba(14,165,233,0.3),_inset_0_4px_12px_rgba(255,255,255,0.6)] border-sky-400';
  if (selected && correct === true) {
    bubbleColorClass =
      'from-emerald-300 via-emerald-400 to-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.4)] border-emerald-400 scale-95 duration-100';
  } else if (isWrong) {
    bubbleColorClass =
      'from-red-300 via-red-400 to-red-600 shadow-[0_4px_10px_rgba(239,68,68,0.4)] border-red-400 scale-95 duration-100';
  }

  return (
    <button
      data-testid={testId}
      {...dataAttrs}
      disabled={disabled}
      onClick={onClick}
      className={`
        relative w-full aspect-square rounded-full flex items-center justify-center border-4
        transition-all duration-150 bg-gradient-to-br hover:scale-105 active:scale-95
        outline-none cursor-pointer overflow-hidden ${bubbleColorClass} ${isWrong ? 'animate-shake' : ''} ${className}
      `}
    >
      <div className="absolute top-2.5 left-3 w-1/4 h-1/8 bg-white/60 rounded-full -rotate-12 pointer-events-none" />
      <div className="absolute bottom-2 right-3.5 w-1/8 h-1/8 bg-white/20 rounded-full pointer-events-none" />
      {children}
    </button>
  );
}
