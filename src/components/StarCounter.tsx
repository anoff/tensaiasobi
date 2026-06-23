import { useEffect, useRef } from 'react';
import type { StarEarnAnimation } from '../hooks/useStars';

interface StarCounterProps {
  stars: number;
  pendingAnimations: StarEarnAnimation[];
  clearAnimation: (id: number) => void;
}

export function StarCounter({ stars, pendingAnimations, clearAnimation }: StarCounterProps) {
  const counterRef = useRef<HTMLDivElement>(null);
  const prevStars = useRef(stars);

  // Pulse the counter when stars change
  useEffect(() => {
    if (stars !== prevStars.current && counterRef.current) {
      counterRef.current.classList.remove('star-counter-pulse');
      // Force reflow
      void counterRef.current.offsetWidth;
      counterRef.current.classList.add('star-counter-pulse');
    }
    prevStars.current = stars;
  }, [stars]);

  return (
    <div className="relative" ref={counterRef}>
      <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-full px-3 py-1.5 shadow-sm select-none min-w-[4rem] justify-center">
        <span className="text-lg">⭐</span>
        <span className="text-base font-black text-amber-800 tabular-nums">{stars}</span>
      </div>

      {/* Fly-up animations */}
      {pendingAnimations.map((anim) => (
        <FlyUpStar key={anim.id} amount={anim.amount} onDone={() => clearAnimation(anim.id)} />
      ))}
    </div>
  );
}

function FlyUpStar({ amount, onDone }: { amount: number; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleEnd = () => {
      onDone();
    };
    el.addEventListener('animationend', handleEnd);
    return () => el.removeEventListener('animationend', handleEnd);
  }, [onDone]);

  return (
    <div
      ref={ref}
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none star-fly-up"
    >
      <span className="text-sm font-black text-amber-600 whitespace-nowrap drop-shadow-sm">
        +{amount} ⭐
      </span>
    </div>
  );
}

export default StarCounter;
