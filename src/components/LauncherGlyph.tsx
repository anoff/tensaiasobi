interface LauncherGlyphProps {
  emoji: string;
  src?: string;
  /** Town / wide buttons can use a slightly smaller glyph. */
  sizeClass?: string;
}

/** Shared square so emoji and SVG launchers sit on the same optical center. */
export function LauncherGlyph({ emoji, src, sizeClass = 'h-12 w-12' }: LauncherGlyphProps) {
  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center leading-none`}>
      {src ? (
        <img src={src} alt="" className="block h-full w-full object-contain pointer-events-none" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-5xl leading-none">{emoji}</span>
      )}
    </span>
  );
}
