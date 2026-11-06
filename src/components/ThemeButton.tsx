import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { INK, hardShadow } from '../theme/blockTable';

/** In-game 🎨 button (Maze, Tower Sort): a cream block that writes the app-wide theme (#74). */
export function ThemeButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-2 border-[3px] rounded-2xl p-2 text-2xl font-extrabold cursor-pointer select-none touch-manipulation outline-none transition-all duration-75 active:translate-x-[3px] active:translate-y-[4px] active:[box-shadow:none] focus-visible:ring-4 focus-visible:ring-amber-400/70 disabled:opacity-50 ${className}`}
      style={{ backgroundColor: '#fff8ec', borderColor: INK, color: INK, boxShadow: hardShadow(3, 4) }}
      {...props}
    >
      {children}
    </button>
  );
}
