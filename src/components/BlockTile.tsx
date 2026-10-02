import React from 'react';
import { LauncherGlyph } from './LauncherGlyph';
import { FILLS, INK, hardShadow, tileLabelOn } from '../theme/blockTable';

/** 4px white halo that follows the glyph outline (plain CSS, no disc). */
const EMOJI_HALO =
  'drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(3px 3px 0 #fff) drop-shadow(-3px 3px 0 #fff) drop-shadow(3px -3px 0 #fff) drop-shadow(-3px -3px 0 #fff)';

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
  /** Grid index — cycles coral, leaf, butter when no `fill` is given. */
  index: number;
  /** Explicit tile colour (the home grid colours tiles by category). */
  fill?: string;
  /** Stable id used for the slight tile tilt. */
  tileId: string;
}

export function BlockTile({ emoji, label, index, fill: fillProp, tileId, className = '', style, ...props }: BlockTileProps) {
  const fill = fillProp ?? tileFill(index);
  const tilt = tileTilt(tileId);

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
          boxShadow: hardShadow(),
          ...style,
        }}
        {...props}
      >
        <span className="flex shrink-0 items-center justify-center" style={{ filter: EMOJI_HALO }}>
          <LauncherGlyph emoji={emoji} sizeClass="h-14 w-14" />
        </span>
        <span
          className="w-full truncate px-0.5 text-center text-[13px] font-black leading-tight tracking-tight sm:text-sm"
          style={{ color: tileLabelOn(fill) }}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

export default BlockTile;
