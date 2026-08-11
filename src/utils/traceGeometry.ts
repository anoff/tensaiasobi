import type { GameDifficulty } from '../types/game';

export interface Point {
  x: number; // 0 to 100 normalized space
  y: number;
}

/** Map a 0-100 normalized point to pixel space for a given canvas size. */
export function getPixelCoord(p: Point, size: number): Point {
  return { x: (p.x / 100) * size, y: (p.y / 100) * size };
}

/** Trace corridor half-width for a difficulty, as a fraction of canvas size. */
export function getMarginSize(
  size: number,
  difficulty: GameDifficulty,
  multipliers: Partial<Record<GameDifficulty, number>>
): number {
  return size * (multipliers[difficulty] ?? 0);
}

export function getDistanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Minimum distance from a point to a polyline. */
export function getDistanceToPath(p: Point, points: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    min = Math.min(min, getDistanceToSegment(p, points[i], points[i + 1]));
  }
  return min;
}

/** Sample a polyline at ~stepSize intervals (endpoints duplicated between segments). */
export function getPathSamples(points: Point[], stepSize = 10): Point[] {
  const samples: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.floor(dist / stepSize));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return samples;
}
