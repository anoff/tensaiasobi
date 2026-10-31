/** Alpha hit-testing for full-size accessory PNGs (their transparent area must not catch a drag). */
const GRID = 64;
const cache = new Map<string, Uint8ClampedArray | null>();

export function preloadAlpha(src: string): void {
  if (cache.has(src) || typeof document === 'undefined') return;
  cache.set(src, null);
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = GRID;
      canvas.height = GRID;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, GRID, GRID);
      cache.set(src, ctx.getImageData(0, 0, GRID, GRID).data);
    } catch {
      /* leave null: falls back to a box hit */
    }
  };
  img.src = src;
}

/** True when the image is opaque at (u, v) in 0–1 image units. Unknown alpha counts the middle half as a hit. */
export function opaqueAt(src: string, u: number, v: number): boolean {
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
  const data = cache.get(src);
  if (!data) return u > 0.25 && u < 0.75 && v > 0.25 && v < 0.75;
  const x = Math.floor(u * GRID);
  const y = Math.floor(v * GRID);
  // Accept a 1-cell neighbourhood so thin parts (glasses frames) are still grabbable.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= GRID || yy >= GRID) continue;
      if (data[(yy * GRID + xx) * 4 + 3] > 40) return true;
    }
  }
  return false;
}
