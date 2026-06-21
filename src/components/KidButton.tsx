import React from 'react';

interface KidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export function KidButton({
  color = 'blue',
  size = 'md',
  children,
  className = '',
  ...props
}: KidButtonProps) {
  const colorMap = {
    pink: 'bg-candy-pink border-pink-600 shadow-[0_8px_0_0_#d81b60]',
    blue: 'bg-candy-blue border-sky-600 shadow-[0_8px_0_0_#0284c7]',
    green: 'bg-candy-green border-emerald-500 shadow-[0_8px_0_0_#059669]',
    yellow: 'bg-candy-yellow border-amber-500 shadow-[0_8px_0_0_#d97706]',
    purple: 'bg-candy-purple border-purple-600 shadow-[0_8px_0_0_#7c3aed]',
    orange: 'bg-candy-orange border-orange-600 shadow-[0_8px_0_0_#ea580c]',
    red: 'bg-red-400 border-red-600 shadow-[0_8px_0_0_#b91c1c]',
  };

  const activeShadowColorMap = {
    pink: 'shadow-[0_2px_0_0_#d81b60]',
    blue: 'shadow-[0_2px_0_0_#0284c7]',
    green: 'shadow-[0_2px_0_0_#059669]',
    yellow: 'shadow-[0_2px_0_0_#d97706]',
    purple: 'shadow-[0_2px_0_0_#7c3aed]',
    orange: 'shadow-[0_2px_0_0_#ea580c]',
    red: 'shadow-[0_2px_0_0_#b91c1c]',
  };

  const sizeMap = {
    sm: 'text-xl px-4 py-2 border-b-4 rounded-xl',
    md: 'text-2xl px-6 py-4 border-b-8 rounded-2xl min-h-16',
    lg: 'text-3xl px-8 py-6 border-b-8 rounded-[2rem] min-h-24 min-w-24',
    xl: 'text-4xl px-10 py-8 border-b-[10px] rounded-[2.5rem] min-h-32 min-w-32',
  };

  return (
    <button
      className={`
        relative inline-flex items-center justify-center font-bold text-white
        transition-all duration-75 border-t border-x border-transparent
        active:translate-y-[6px]
        ${colorMap[color]}
        ${sizeMap[size]}
        active:${activeShadowColorMap[color]}
        select-none touch-manipulation cursor-pointer outline-none
        ${className}
      `}
      {...props}
    >
      <span className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.2)]">
        {children}
      </span>
    </button>
  );
}
export default KidButton;
