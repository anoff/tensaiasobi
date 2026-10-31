import { useEffect } from 'react';
import { characterArt, type Collectible } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CHALK } from '../../theme/blockTable';

/** Total award time (ART.md §8: about 2.5 s, no tap needed). */
export const AWARD_MS = 2500;

/**
 * Sticker won: Panda cheers, the sticker pops in over butter rays on a 45 % ink scrim, then flies
 * to the book. Pure decoration: pointer-events none, so it never blocks the game underneath.
 */
export function StickerAward({ sticker, onDone }: { sticker: Collectible; onDone: () => void }) {
  const { t } = useTranslation();
  const panda = characterArt('panda', 'cheer');
  useEffect(() => {
    const id = window.setTimeout(onDone, AWARD_MS);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div
      data-testid="sticker-award"
      data-sticker={sticker.id}
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center sticker-award-scrim"
      style={{ backgroundColor: 'rgba(42,28,20,0.45)' }}
    >
      <div className="relative flex flex-col items-center sticker-award-fly">
        <span aria-hidden className="sticker-award-rays absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full" />
        {sticker.src && <img src={sticker.src} alt="" className="relative h-44 w-44 animate-card-in" />}
        <p className="relative mt-2 text-2xl font-black" style={{ color: CHALK, textShadow: '2px 3px 0 #2a1c14' }}>
          {t.stickerBook.newSticker}
        </p>
      </div>
      {panda && (
        <img
          src={panda}
          alt=""
          aria-hidden
          className="absolute bottom-6 left-4 h-32 w-32 animate-card-in"
          data-testid="sticker-award-panda"
        />
      )}
    </div>
  );
}
