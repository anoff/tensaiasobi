import { useEffect, useRef, useState } from 'react';
import type { AccessoryPlacement } from '../../data/stickerRules';
import { ACCESSORIES, accessoryById, type Collectible } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { BUTTER, CHALK, INK, hardShadow } from '../../theme/blockTable';
import KidButton from '../KidButton';
import { StickerImage } from './StickerImage';
import { opaqueAt, preloadAlpha } from './alphaHit';
import { usePointerDrag } from './usePointerDrag';

interface DragItem {
  accessoryId: string;
  from: 'tray' | 'sticker';
}

interface StickerDetailProps {
  sticker: Collectible;
  placements: readonly AccessoryPlacement[];
  ownedAccessories: readonly string[];
  stars: number;
  onBuy: (accessoryId: string) => boolean;
  onPlace: (accessoryId: string, x: number, y: number) => void;
  onRemove: (accessoryId: string) => void;
  onClose: () => void;
  playPop: () => void;
}

/** Big sticker plus the accessory tray: buy with stars, drag on, move, drag off. */
export function StickerDetail({
  sticker,
  placements,
  ownedAccessories,
  stars,
  onBuy,
  onPlace,
  onRemove,
  onClose,
  playPop,
}: StickerDetailProps) {
  const { t } = useTranslation();
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(220);
  const [shake, setShake] = useState<string | null>(null);

  useEffect(() => {
    ACCESSORIES.forEach((a) => a.src && preloadAlpha(a.src));
    const fit = () => setSize(Math.max(160, Math.min(260, window.innerWidth - 140, window.innerHeight * 0.32)));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const localPoint = (x: number, y: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return null;
    return { u: (x - r.left) / r.width, v: (y - r.top) / r.height };
  };

  const { drag, start } = usePointerDrag<DragItem>((item, x, y, moved) => {
    const p = localPoint(x, y);
    const inside = p && p.u >= -0.05 && p.u <= 1.05 && p.v >= -0.05 && p.v <= 1.05;
    if (!moved) {
      // A tap on an owned tray accessory puts it on at its drawn spot (the PNGs are made for the centre).
      if (item.from === 'tray') {
        playPop();
        onPlace(item.accessoryId, 0.5, 0.5);
      }
      return;
    }
    playPop();
    if (inside && p) onPlace(item.accessoryId, p.u, p.v);
    else if (item.from === 'sticker') onRemove(item.accessoryId);
  });

  /** Grab the top-most placed accessory under the finger (alpha test, not its square box). */
  const grabPlaced = (e: React.PointerEvent) => {
    const p = localPoint(e.clientX, e.clientY);
    if (!p) return;
    for (const pl of [...placements].reverse()) {
      const acc = accessoryById(pl.accessoryId);
      if (acc?.src && opaqueAt(acc.src, p.u - (pl.x - 0.5), p.v - (pl.y - 0.5))) {
        start({ accessoryId: pl.accessoryId, from: 'sticker' }, e);
        return;
      }
    }
  };

  const buy = (id: string) => {
    if (onBuy(id)) return;
    setShake(id);
    window.setTimeout(() => setShake(null), 600);
  };

  const ghost = drag?.moved ? accessoryById(drag.item.accessoryId) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ backgroundColor: 'rgba(42,28,20,0.45)' }}
      data-testid="sticker-detail"
      data-sticker={sticker.id}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-[2rem] border-[3px] p-4 animate-pop-in"
        style={{ backgroundColor: CHALK, borderColor: INK, boxShadow: hardShadow() }}
      >
        <button
          type="button"
          data-testid="sticker-detail-close"
          aria-label={t.stickerBook.close}
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border-[3px] text-xl font-black"
          style={{ backgroundColor: BUTTER, borderColor: INK, boxShadow: hardShadow(3, 4) }}
        >
          ✕
        </button>

        <div className="flex justify-center pt-4 pb-2">
          <div
            ref={boxRef}
            data-testid="sticker-detail-box"
            className="relative touch-none"
            style={{ width: size, height: size }}
            onPointerDown={grabPlaced}
          >
            <StickerImage
              src={sticker.src}
              size={size}
              placements={placements}
              hiddenAccessory={drag?.moved && drag.item.from === 'sticker' ? drag.item.accessoryId : null}
              testId="sticker-detail-image"
            />
          </div>
        </div>

        <p className="text-center text-sm font-extrabold" style={{ color: '#6b5a4c' }}>
          {t.stickerBook.dragHint}
        </p>

        <h3 className="mt-2 mb-2 text-lg font-black" style={{ color: INK }}>
          {t.stickerBook.accessories}
        </h3>
        <div className="grid grid-cols-4 gap-3" data-testid="accessory-tray">
          {ACCESSORIES.map((acc) => {
            const owned = ownedAccessories.includes(acc.id);
            const affordable = stars >= acc.price;
            return (
              <div key={acc.id} className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  data-testid={`accessory-${acc.id}`}
                  data-owned={String(owned)}
                  aria-label={acc.id}
                  disabled={!owned}
                  onPointerDown={owned ? (e) => start({ accessoryId: acc.id, from: 'tray' }, e) : undefined}
                  className={`flex aspect-square w-full items-center justify-center rounded-2xl border-[3px] touch-none ${
                    shake === acc.id ? 'animate-shake' : ''
                  }`}
                  style={{
                    backgroundColor: owned ? '#fff' : 'rgba(184,174,163,0.25)',
                    borderColor: INK,
                    boxShadow: owned ? hardShadow(3, 4) : 'none',
                    cursor: owned ? 'grab' : 'default',
                  }}
                >
                  {acc.src && (
                    <img
                      src={acc.src}
                      alt=""
                      draggable={false}
                      className="pointer-events-none h-[140%] w-[140%] max-w-none"
                      style={{ opacity: owned ? 1 : 0.45 }}
                    />
                  )}
                </button>
                {!owned && (
                  <KidButton
                    size="sm"
                    color="yellow"
                    data-testid={`buy-${acc.id}`}
                    aria-label={`${t.stickerBook.buy} ${acc.price}`}
                    onClick={() => buy(acc.id)}
                    className={`!px-2 !py-1 !text-sm ${affordable ? '' : 'opacity-60'}`}
                  >
                    ⭐ {acc.price}
                  </KidButton>
                )}
              </div>
            );
          })}
        </div>
        {shake && (
          <p className="mt-2 text-center text-sm font-black" style={{ color: INK }} data-testid="not-enough-stars">
            {t.stickerBook.notEnough}
          </p>
        )}
      </div>

      {ghost?.src && drag && (
        <img
          src={ghost.src}
          alt=""
          aria-hidden
          className="pointer-events-none fixed z-[60] max-w-none"
          style={{ width: size, height: size, left: drag.x - size / 2, top: drag.y - size / 2 }}
        />
      )}
    </div>
  );
}
