import React from 'react';

interface KidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary';
  children: React.ReactNode;
}

const COLORS: Record<Required<KidButtonProps>['color'], { base: string; dark: string; ring: string }> = {
  pink: { base: '#FF6EB4', dark: '#d81b60', ring: 'ring-pink-300/60' },
  blue: { base: '#4FC3F7', dark: '#0284c7', ring: 'ring-sky-300/60' },
  green: { base: '#69F0AE', dark: '#059669', ring: 'ring-emerald-300/60' },
  yellow: { base: '#FFD740', dark: '#d97706', ring: 'ring-amber-300/60' },
  purple: { base: '#CE93D8', dark: '#7c3aed', ring: 'ring-purple-300/60' },
  orange: { base: '#FFAB40', dark: '#ea580c', ring: 'ring-orange-300/60' },
  red: { base: '#f87171', dark: '#b91c1c', ring: 'ring-red-300/60' },
};

const SIZE_MAP = {
  sm: 'text-xl px-4 py-2 border-b-4 rounded-xl',
  md: 'text-2xl px-6 py-4 border-b-8 rounded-2xl min-h-16',
  lg: 'text-3xl px-8 py-6 border-b-8 rounded-[2rem] min-h-24 min-w-24',
  xl: 'text-4xl px-10 py-8 border-b-[10px] rounded-[2.5rem] min-h-32 min-w-32',
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
  const c = COLORS[color];
  const primaryClass =
    variant === 'primary'
      ? `scale-105 ring-4 ${c.ring} animate-kid-btn-glow`
      : '';

  return (
    <button
      className={`
        relative inline-flex items-center justify-center font-bold text-white
        transition-all duration-75 border-t border-x border-transparent
        active:translate-y-[6px]
        ${SIZE_MAP[size]}
        select-none touch-manipulation cursor-pointer outline-none
        ${primaryClass}
        ${className}
      `}
      style={{
        backgroundColor: c.base,
        borderColor: c.dark,
        boxShadow: `0 8px 0 0 ${c.dark}`,
        ...style,
      }}
      {...props}
    >
      <span className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        {children}
      </span>
    </button>
  );
}

export default KidButton;
