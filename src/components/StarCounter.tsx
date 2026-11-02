import { useEffect, useRef } from 'react';
import { FlyUpStar } from './FlyUpStar';

interface StarCounterProps {
  stars: number;
  pendingAnimations: { id: number; amount: number }[];
  clearAnimation: (id: number) => void;
  /** Slimmer pill for a crowded bar (the sticker book's 48 px top bar). */
  compact?: boolean;
}

export function StarCounter({ stars, pendingAnimations, clearAnimation, compact = false }: StarCounterProps) {
  const counterRef = useRef<HTMLDivElement>(null);
  const prevStars = useRef(stars);


  useEffect(() => {
    if (stars !== prevStars.current && counterRef.current) {
      counterRef.current.classList.remove('star-counter-pulse');

      void counterRef.current.offsetWidth;
      counterRef.current.classList.add('star-counter-pulse');
    }
    prevStars.current = stars;
  }, [stars]);

  return (
    <div className="relative" ref={counterRef}>
      <div
        className={`flex items-center bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300 rounded-full py-1.5 shadow-sm select-none justify-center ${
          compact ? 'gap-1 px-2' : 'gap-1.5 px-3 min-w-[4rem]'
        }`}
      >
        <span className={compact ? 'text-base' : 'text-lg'}>⭐</span>
        <span className="text-base font-black text-amber-800 tabular-nums" data-testid="stars-total">{stars}</span>
      </div>

      {/* Fly-up animations */}
      {pendingAnimations.map((anim) => (
        <FlyUpStar key={anim.id} onDone={() => clearAnimation(anim.id)}>
          <span className="text-sm font-black text-amber-600 whitespace-nowrap drop-shadow-sm">
            +{anim.amount} ⭐
          </span>
        </FlyUpStar>
      ))}
    </div>
  );
}

export default StarCounter;
