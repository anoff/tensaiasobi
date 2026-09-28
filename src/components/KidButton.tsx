import React from 'react';
import { BUTTER, CORAL, INK, LEAF, hardShadow, onFill } from '../theme/blockTable';

interface KidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary';
  children: React.ReactNode;
}

/** Legacy candy names folded onto the three block-table fills. */
const FILL: Record<Required<KidButtonProps>['color'], string> = {
  pink: CORAL,
  red: CORAL,
  orange: CORAL,
  blue: LEAF,
  green: LEAF,
  yellow: BUTTER,
  purple: BUTTER,
};

const SIZE_MAP = {
  sm: { className: 'text-xl px-4 py-2 rounded-xl active:translate-x-[3px] active:translate-y-[4px]', shadow: hardShadow(3, 4) },
  md: { className: 'text-2xl px-6 py-4 rounded-2xl min-h-16 active:translate-x-[5px] active:translate-y-[6px]', shadow: hardShadow() },
  lg: { className: 'text-3xl px-8 py-6 rounded-[2rem] min-h-24 min-w-24 active:translate-x-[5px] active:translate-y-[6px]', shadow: hardShadow() },
  xl: { className: 'text-4xl px-10 py-8 rounded-[2.5rem] min-h-32 min-w-32 active:translate-x-[6px] active:translate-y-[7px]', shadow: hardShadow(6, 7) },
};

export function KidButton({
  color = 'blue',
  size = 'md',
  variant = 'default',
  children,
  className = '',
  style,
  ...props
}: KidButtonProps) {
  const fill = FILL[color];
  const s = SIZE_MAP[size];
  const primaryClass = variant === 'primary' ? 'scale-105 ring-4 ring-amber-400/70 animate-kid-btn-glow' : '';

  return (
    <button
      className={`
        relative inline-flex items-center justify-center font-black border-[3px]
        transition-all duration-75 active:[box-shadow:none]
        ${s.className}
        select-none touch-manipulation cursor-pointer outline-none
        focus-visible:ring-4 focus-visible:ring-amber-400/70
        ${primaryClass}
        ${className}
      `}
      style={{
        backgroundColor: fill,
        borderColor: INK,
        color: onFill(fill),
        boxShadow: s.shadow,
        ...style,
      }}
      {...props}
    >
      <span className="relative inline-flex flex-col items-center justify-center gap-1 leading-none">
        {children}
      </span>
    </button>
  );
}

export default KidButton;
