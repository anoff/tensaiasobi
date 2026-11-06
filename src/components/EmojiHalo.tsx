import { useId, type ReactNode } from 'react';

/** 4 px halo on launcher tiles and the 32 px theme emoji. */
export const TILE_HALO_PX = 4;
/** 2 px halo on the 26 px Parents’ guide icons. */
export const GUIDE_HALO_PX = 2;

/**
 * Even white sticker cut around a glyph: dilate SourceAlpha, flood white,
 * composite behind the original. One filter — not chained drop-shadows.
 */
export function EmojiHalo({
  radius,
  className = '',
  children,
}: {
  radius: number;
  className?: string;
  children: ReactNode;
}) {
  const id = `emoji-halo-${useId().replace(/:/g, '')}`;

  return (
    <span className={`relative inline-flex overflow-visible ${className}`.trim()}>
      <svg
        aria-hidden
        focusable="false"
        width={0}
        height={0}
        className="pointer-events-none absolute overflow-visible"
      >
        <filter
          id={id}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="spread" />
          <feFlood floodColor="#ffffff" result="fill" />
          <feComposite in="fill" in2="spread" operator="in" result="halo" />
          <feMerge>
            <feMergeNode in="halo" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      <span className="inline-flex overflow-visible" style={{ filter: `url(#${id})` }} data-testid="emoji-halo" data-halo-radius={radius}>
        {children}
      </span>
    </span>
  );
}
