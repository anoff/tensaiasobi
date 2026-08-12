import { useMemo } from 'react';

interface GameConfettiProps {
  pieces?: number;
  recycle?: boolean;
}

interface Piece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
}

const COLORS = ['#FF6EB4', '#4FC3F7', '#69F0AE', '#FFD740', '#CE93D8', '#FFAB40'];

function makeItems(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 1.5 + Math.random() * 1.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
  }));
}

export default function GameConfetti({ pieces = 150, recycle = false }: GameConfettiProps) {
  // Generate the random pieces once per mount instead of on every render.
  // Without this, any parent re-render (e.g. from cursor/pointer move state
  // updates) would regenerate all pieces with new random positions/timing,
  // making the confetti jump around and look broken while it's animating.
  const items = useMemo(() => makeItems(pieces), [pieces]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {items.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 confetti-fall"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationIterationCount: recycle ? 'infinite' : 1,
          }}
        />
      ))}
    </div>
  );
}
