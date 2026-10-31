import type { CSSProperties } from 'react';
import type { AccessoryPlacement } from '../../data/stickerRules';
import { accessoryById } from '../../data/stickers';
import { PEBBLE } from '../../theme/blockTable';

/** Empty album slot: the AD outline rule (pebble ~35 % fill, dashed pebble edge), as a circle. */
export function EmptySlot({ size, testId }: { size: number | string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      aria-hidden
      className="block rounded-full border-2 border-dashed"
      style={{ width: size, height: size, borderColor: PEBBLE, backgroundColor: 'rgba(184,174,163,0.35)' }}
    />
  );
}

/** Faded outline of a known shape (scene pieces): the PNG used as a mask over a pebble fill. */
export function GhostOutline({ src, style, piece }: { src: string; style?: CSSProperties; piece?: string }) {
  const mask = `url("${src}") center / 100% 100% no-repeat`;
  return (
    <span
      aria-hidden
      data-testid="scene-ghost"
      data-piece={piece}
      className="absolute block"
      style={{ ...style, backgroundColor: 'rgba(184,174,163,0.55)', WebkitMask: mask, mask }}
    />
  );
}

interface StickerImageProps {
  src: string | undefined;
  /** Rendered size in px. Accessories render at the same size, centred on their placement point. */
  size: number;
  placements?: readonly AccessoryPlacement[];
  /** Hide one placement (it is being dragged). */
  hiddenAccessory?: string | null;
  tilt?: number;
  className?: string;
  testId?: string;
}

/** A drawn die-cut sticker with its accessories on top. Missing art falls back to an empty slot. */
export function StickerImage({
  src,
  size,
  placements = [],
  hiddenAccessory,
  tilt = 0,
  className = '',
  testId,
}: StickerImageProps) {
  if (!src) return <EmptySlot size={size} testId={testId} />;
  return (
    <span
      data-testid={testId}
      className={`relative inline-block select-none ${className}`}
      style={{ width: size, height: size, transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <img src={src} alt="" draggable={false} className="pointer-events-none block h-full w-full" />
      {placements.map((p) => {
        const acc = accessoryById(p.accessoryId);
        if (!acc?.src || p.accessoryId === hiddenAccessory) return null;
        return (
          <img
            key={p.accessoryId}
            src={acc.src}
            alt=""
            draggable={false}
            data-testid="placed-accessory"
            data-accessory={p.accessoryId}
            className="pointer-events-none absolute max-w-none"
            style={{ width: size, height: size, left: (p.x - 0.5) * size, top: (p.y - 0.5) * size }}
          />
        );
      })}
    </span>
  );
}
