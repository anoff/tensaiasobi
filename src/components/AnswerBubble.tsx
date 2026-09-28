import type { ReactNode } from 'react';
import { CORAL, INK, LEAF, hardShadow } from '../theme/blockTable';

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

  const settled = (selected && correct === true) || isWrong;
  let fill = '#fff8ec';
  if (selected && correct === true) fill = LEAF;
  else if (isWrong) fill = CORAL;

  return (
    <button
      data-testid={testId}
      {...dataAttrs}
      disabled={disabled}
      onClick={onClick}
      className={`
        relative w-full aspect-square rounded-full flex items-center justify-center border-[3px]
        transition-all duration-100 active:translate-x-[4px] active:translate-y-[5px] active:[box-shadow:none]
        outline-none cursor-pointer overflow-hidden focus-visible:ring-4 focus-visible:ring-amber-400/70
        ${settled ? 'translate-x-[2px] translate-y-[3px]' : ''} ${isWrong ? 'animate-shake' : ''} ${className}
      `}
      style={{
        backgroundColor: fill,
        borderColor: INK,
        color: settled ? '#fff' : INK,
        boxShadow: settled ? hardShadow(2, 3) : hardShadow(4, 5),
      }}
    >
      {children}
    </button>
  );
}
