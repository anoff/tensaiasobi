import { useEffect, useRef, useState } from 'react';
import { CAPSULE_MACHINE, KNOB_PIVOT, capsuleArt, characterArt, stickerLook, type Collectible } from '../../data/stickers';
import type { SoundCue } from '../../hooks/useSound';
import { useTranslation } from '../../hooks/useTranslation';
import { INK } from '../../theme/blockTable';
import { CountBadge, SparkleOverlay } from './StickerImage';
import { HINT_MS, REVEAL_MS, SELF_OPEN_MS, STATIC_REVEAL_MS, TWIST_MS, phaseAt, type Phase } from './awardTimeline';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Small-item hard shadow (ART.md), on each capsule half so they separate cleanly. */
const HALF_SHADOW = 'drop-shadow(3px 4px 0 #2a1c14)';

/** The Art Director's capsule machine (240 px box) at 150 CSS px: knob layer on the body, turning about its pivot. */
function Machine({ twisting }: { twisting: boolean }) {
  return (
    <span className="relative block h-[150px] w-[150px]" data-testid="capsule-machine">
      <img src={CAPSULE_MACHINE.body} alt="" aria-hidden className="absolute inset-0 h-full w-full" />
      <img
        src={CAPSULE_MACHINE.knob}
        alt=""
        aria-hidden
        data-testid="capsule-knob"
        className={`absolute inset-0 h-full w-full ${twisting ? 'capsule-knob-twist' : ''}`}
        style={{ transformOrigin: KNOB_PIVOT }}
      />
    </span>
  );
}

/** The played shelf's capsule (96 px). Opening lifts and tips the top about the centre; the bottom stays. */
function Capsule({ shelf, open }: { shelf: Collectible['shelf']; open: boolean }) {
  const art = capsuleArt(shelf);
  if (!open) return <img src={art.closed} alt="" className="block h-24 w-24" style={{ filter: HALF_SHADOW }} />;
  return (
    <span className="relative block h-24 w-24">
      <img src={art.bottom} alt="" className="capsule-split-bottom absolute inset-0 h-full w-full" style={{ filter: HALF_SHADOW }} />
      <img src={art.top} alt="" className="capsule-split-top absolute inset-0 h-full w-full" style={{ filter: HALF_SHADOW }} />
    </span>
  );
}

interface StickerAwardProps {
  sticker: Collectible;
  shiny: boolean;
  /** Copies of this sticker owned now; 2+ shows "×N". */
  count: number;
  onDone: () => void;
  playCue?: (cue: SoundCue) => void;
}

/**
 * Capsule won (ART.md §6 capsules, §8), on a cream scrim: the machine's knob turns and the played
 * shelf's capsule rolls out next to the cheering panda, then waits for a tap (wiggle hint at 1.5 s,
 * opens itself only at 4 s). Opening splits it and the sticker pops with butter rays and card-in.
 * Taps are never ignored: a tap during the twist opens the capsule right away, a tap on the reveal
 * closes it. Duplicates say "Again!" and keep the ×N badge. Reduced motion shows the sticker statically.
 */
export function StickerAward({ sticker, shiny, count, onDone, playCue }: StickerAwardProps) {
  const { t } = useTranslation();
  const panda = characterArt('panda', 'cheer');
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(phaseAt(0, reduced));
  const look = stickerLook(sticker, shiny);
  // App re-renders hand in a fresh playCue; keep it out of the phase effect so timers never restart.
  const cue = useRef(playCue);
  useEffect(() => {
    cue.current = playCue;
  }, [playCue]);

  useEffect(() => {
    if (phase !== 'reveal') {
      if (phase === 'twist') cue.current?.('capsule_twist');
      const next = { twist: TWIST_MS, ready: HINT_MS, hint: SELF_OPEN_MS }[phase];
      const prev = { twist: 0, ready: TWIST_MS, hint: HINT_MS }[phase];
      const id = window.setTimeout(() => setPhase(phaseAt(next, reduced)), next - prev);
      return () => window.clearTimeout(id);
    }
    cue.current?.('capsule_pop');
    if (shiny) cue.current?.('shiny_sparkle');
    const id = window.setTimeout(onDone, reduced ? STATIC_REVEAL_MS : REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [phase, onDone, reduced, shiny]);

  const tap = () => (phase === 'reveal' ? onDone() : setPhase('reveal'));

  return (
    <div
      data-testid="sticker-award"
      data-sticker={sticker.id}
      data-shelf={sticker.shelf ?? 'general'}
      data-shiny={String(shiny)}
      data-count={count}
      data-phase={phase}
      aria-live="polite"
      role="button"
      tabIndex={0}
      aria-label={t.stickerBook.newSticker}
      onClick={tap}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && tap()}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center short:pb-[174px] outline-none select-none"
      // Cream scrim (AD): the game board must not show through; panda and machine sit on top of it.
      style={{ backgroundColor: 'rgba(255,248,236,0.85)' }}
    >
      <div className="relative flex h-56 w-56 items-center justify-center">
        {phase === 'reveal' ? (
          <>
            <span aria-hidden className="sticker-award-rays absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full" />
            {!reduced && (
              <span aria-hidden className="absolute" data-testid="capsule-open">
                <Capsule shelf={sticker.shelf} open />
              </span>
            )}
            <span className="relative h-44 w-44 animate-card-in" data-testid="award-sticker">
              {look.src && <img src={look.src} alt="" className="block h-full w-full" />}
              {look.sparkle && <SparkleOverlay />}
              {count > 1 && <CountBadge count={count} testId="award-count" />}
            </span>
          </>
        ) : (
          <span className={{ twist: 'capsule-roll-out', ready: '', hint: 'capsule-wiggle', reveal: '' }[phase]} data-testid="capsule">
            <Capsule shelf={sticker.shelf} open={false} />
          </span>
        )}
      </div>
      {phase === 'reveal' && (
        <p className="relative mt-1 text-2xl font-black" style={{ color: INK }} data-testid="award-caption">
          {count > 1 ? t.stickerBook.again : t.stickerBook.newSticker}
        </p>
      )}
      <div className="pointer-events-none absolute bottom-6 left-4 flex items-end gap-1">
        {panda && <img src={panda} alt="" aria-hidden className="h-[120px] w-[120px] animate-card-in" data-testid="sticker-award-panda" />}
        <Machine twisting={phase === 'twist'} />
      </div>
    </div>
  );
}
