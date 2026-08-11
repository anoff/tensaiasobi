import type { ReactNode } from 'react';

export function FlyUpStar({ onDone, children }: { onDone: () => void; children: ReactNode }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none star-fly-up" onAnimationEnd={onDone}>
      {children}
    </div>
  );
}
