import { useEffect, useRef } from 'react';
import { paintBackground } from '../../data/sceneArt';
import type { PageBackground } from '../../data/stickerRules';

interface SceneBackgroundProps {
  background: PageBackground;
  /** CSS pixel size of the box it fills. */
  width: number;
  height: number;
  className?: string;
  /** A picker card: drawn with the theme's thumbnail sky. */
  thumbnail?: boolean;
}

/** A page background on a canvas, drawn by the same composite the print PDF uses. */
export function SceneBackground({ background, width, height, className = '', thumbnail = false }: SceneBackgroundProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = background === 'blank' ? 'blank' : `${background.theme}:${background.seed}`;
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || width <= 0 || height <= 0) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    let live = true;
    // Paint off-screen first, so a re-roll swaps in one go once its layers have loaded.
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const offCtx = off.getContext('2d');
    if (!offCtx) return;
    void paintBackground(offCtx, w, h, background, thumbnail).then(() => {
      if (!live) return;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(off, 0, 0);
    });
    return () => {
      live = false;
    };
    // `key` stands for `background`, which is a fresh object on every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, width, height, thumbnail]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      data-testid="scene-background"
      data-scene={key}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
