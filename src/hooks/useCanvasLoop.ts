import { useEffect, type DependencyList, type RefObject } from 'react';

/**
 * Runs a requestAnimationFrame draw loop, resizing the canvas to fit its
 * container (square, capped at maxSize) on mount and on window resize.
 * The loop tears down and re-creates whenever `deps` change, mirroring the
 * per-game effects it replaces.
 */
export function useCanvasLoop(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  containerRef: RefObject<HTMLDivElement | null>,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  deps: DependencyList,
  maxSize: number,
) {
  // deps is caller-controlled; the caller decides which game state restarts the loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height, maxSize);
      canvas.width = size;
      canvas.height = size;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let raf = 0;
    const loop = () => {
      draw(ctx, canvas.width);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(raf);
    };
    // deps is caller-controlled; the caller decides which game state restarts the loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
