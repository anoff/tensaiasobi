import React from 'react';
import { LauncherGlyph } from './LauncherGlyph';

const FILLS = ['#ff4d3a', '#1f9a62', '#ffc21a'] as const;
const INK = '#2a1c14';
const PAPER = '#fff6e8';

function tileTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % 9) + 9) % 9) - 4;
}

function tileFill(index: number): string {
  return FILLS[index % FILLS.length];
}

interface BlockTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  emoji: string;
  label: string;
  /** Catalog / grid index — cycles coral, leaf, butter. */
  index: number;
  /** Stable id used for the slight tile tilt. */
  tileId: string;
}

export function BlockTile({ emoji, label, index, tileId, className = '', style, ...props }: BlockTileProps) {
  const fill = tileFill(index);
  const tilt = tileTilt(tileId);
  const inkGlyph = fill === '#ffc21a';
  const glyphColor = inkGlyph ? INK : PAPER;

  return (
    <div className="min-h-24 min-w-24" style={{ transform: `rotate(${tilt}deg)` }}>
      <button
        type="button"
        className={`
          relative flex aspect-square h-full w-full min-h-24 min-w-24 flex-col items-center justify-center
          gap-1 rounded-[1.6rem] border-[3px] px-1.5 pt-2 pb-1.5
          select-none touch-manipulation cursor-pointer outline-none
          focus-visible:ring-4 focus-visible:ring-amber-400/70
          active:translate-x-[5px] active:translate-y-[6px] active:[box-shadow:none]
          ${className}
        `}
        style={{
          backgroundColor: fill,
          borderColor: INK,
          color: glyphColor,
          boxShadow: `5px 6px 0 0 ${INK}`,
          ...style,
        }}
        {...props}
      >
        <LauncherGlyph emoji={emoji} sizeClass="h-14 w-14" />
        <span
          className="w-full truncate px-0.5 text-center text-[13px] font-black leading-tight tracking-tight sm:text-sm"
          style={{ color: INK }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

export default BlockTile;
