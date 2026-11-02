import type { AccessoryPlacement } from '../../data/stickerRules';
import { SHINY_SPARKLE, accessoryById } from '../../data/stickers';
import { INK, PEBBLE } from '../../theme/blockTable';

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

/**
 * Missing sticker in the collection: its own shape as a pebble silhouette, the §6 outline rule
 * (pebble 35 % over the page, here as the solid mix so layers don't stack) with a 2 px pebble
 * edge. A masked shape can't carry a dashed stroke, so the edge is solid.
 */
export function Silhouette({
  src,
  size,
  tilt = 0,
  testId,
}: {
  src: string;
  size: number;
  tilt?: number;
  testId?: string;
}) {
  const mask = {
    mask: `url("${src}") center / contain no-repeat`,
    WebkitMask: `url("${src}") center / contain no-repeat`,
  };
  const edge = ['2px 0', '-2px 0', '0 2px', '0 -2px'].map((o) => `drop-shadow(${o} 0 ${PEBBLE})`).join(' ');
  return (
    <span
      data-testid={testId}
      data-silhouette="true"
      aria-hidden
      className="relative block"
      style={{ width: size, height: size, transform: `rotate(${tilt}deg)` }}
    >
      {/* Filter on a wrapper: on the masked span itself the mask would clip the edge away. */}
      <span className="absolute inset-0" style={{ filter: edge }}>
        <span className="block h-full w-full" style={{ backgroundColor: PEBBLE, ...mask }} />
      </span>
      <span className="absolute inset-0" style={{ backgroundColor: SLOT_TINT, ...mask }} />
    </span>
  );
}

/** Pebble #b8aea3 at 35 % over the collection page #fff8ec. */
const SLOT_TINT = '#e6ddd2';

interface StickerImageProps {
  src: string | undefined;
  /** Rendered size in px. Accessories render at the same size, centred on their placement point. */
  size: number;
  placements?: readonly AccessoryPlacement[];
  /** Hide one placement (it is being dragged). */
  hiddenAccessory?: string | null;
  tilt?: number;
  /** Shiny copy (pass the shiny art as `src`; see stickerLook). */
  shiny?: boolean;
  /** Draw the sparkle overlay (art without a baked shiny PNG). */
  sparkle?: boolean;
  /** Copies owned; 2+ shows the ink "×N" badge at the bottom-right. */
  count?: number;
  className?: string;
  testId?: string;
}

/** Ink "×N" duplicate badge, bottom-right of a sticker. */
export function CountBadge({ count, testId = 'sticker-count' }: { count: number; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className="pointer-events-none absolute -bottom-1 -right-1 rounded-full border-2 px-1.5 text-xs font-black leading-5 tabular-nums"
      style={{ backgroundColor: INK, borderColor: '#fff', color: '#fff' }}
    >
      ×{count}
    </span>
  );
}

/** The Art Director's shiny sparkle, drawn over the sticker at the same size (stars at the top right). */
export function SparkleOverlay() {
  if (!SHINY_SPARKLE) return null;
  return (
    <img
      src={SHINY_SPARKLE}
      alt=""
      aria-hidden
      draggable={false}
      data-testid="sticker-sparkle"
      className="shiny-sparkle pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

/** A drawn die-cut sticker with its accessories on top. Missing art falls back to an empty slot. */
export function StickerImage({
  src,
  size,
  placements = [],
  hiddenAccessory,
  tilt = 0,
  shiny = false,
  sparkle = false,
  count = 1,
  className = '',
  testId,
}: StickerImageProps) {
  if (!src) return <EmptySlot size={size} testId={testId} />;
  return (
    <span
      data-testid={testId}
      data-shiny={shiny ? 'true' : undefined}
      className={`relative inline-block select-none ${className}`}
      style={{ width: size, height: size, transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <img src={src} alt="" draggable={false} className="pointer-events-none block h-full w-full" />
      {sparkle && <SparkleOverlay />}
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
      {count > 1 && <CountBadge count={count} />}
    </span>
  );
}
