import { useEffect, useRef, useState } from 'react';
import type { StickerSave } from '../../data/stickerRules';
import { collectibleById, type SceneSet } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { INK, PAPER, PEBBLE } from '../../theme/blockTable';
import { GhostOutline } from './StickerImage';
import { usePointerDrag } from './usePointerDrag';

interface SceneBoardProps {
  scene: SceneSet;
  book: StickerSave;
  onPlacePiece: (pieceId: string) => void;
  playPop: () => void;
  playSuccess: () => void;
}

/** A scene page: faded outlines; earned pieces wait in a tray and are dragged onto their outline. */
export function SceneBoard({ scene, book, onPlacePiece, playPop, playSuccess }: SceneBoardProps) {
  const { t } = useTranslation();
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => setBoardWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { view } = scene;
  const pct = (n: number, of: number) => `${(n / of) * 100}%`;
  const boxStyle = (b: { x: number; y: number; size: number }) => ({
    left: pct(b.x - view.x, view.w),
    top: pct(b.y - view.y, view.h),
    width: pct(b.size, view.w),
    height: pct(b.size, view.h),
  });

  const placed = new Set(book.placedPieces);
  const waiting = scene.pieces.filter((p) => p.src && book.earned.includes(p.id) && !placed.has(p.id));
  const complete = scene.pieces.length > 0 && scene.pieces.every((p) => placed.has(p.id));
  const reward = collectibleById(scene.rewardId);

  const { drag, start } = usePointerDrag<string>((pieceId, x, y, moved) => {
    const piece = scene.pieces.find((p) => p.id === pieceId);
    const r = boardRef.current?.getBoundingClientRect();
    if (!piece || !r || !moved) return;
    const sx = view.x + ((x - r.left) / r.width) * view.w;
    const sy = view.y + ((y - r.top) / r.height) * view.h;
    const { box } = piece;
    // Snap when dropped anywhere on the piece's own outline square (generous for small hands).
    if (sx >= box.x && sx <= box.x + box.size && sy >= box.y && sy <= box.y + box.size) {
      const willComplete = scene.pieces.every((p) => p.id === pieceId || placed.has(p.id));
      if (willComplete) playSuccess();
      else playPop();
      onPlacePiece(pieceId);
    }
  });

  const dragged = drag?.moved ? scene.pieces.find((p) => p.id === drag.item) : undefined;
  const ghostPx = dragged ? (dragged.box.size / view.w) * boardWidth : 0;

  return (
    <div data-testid={`scene-${scene.shelf}`} data-complete={String(complete)} className="space-y-2">
      <div
        ref={boardRef}
        data-testid="scene-board"
        className="relative w-full overflow-visible rounded-2xl border-2"
        style={{
          aspectRatio: `${view.w} / ${view.h}`,
          backgroundColor: scene.pageSrc ? 'transparent' : PAPER,
          borderColor: scene.pageSrc ? 'transparent' : PEBBLE,
        }}
      >
        {scene.pageSrc && (
          <img
            src={scene.pageSrc}
            alt=""
            aria-hidden
            draggable={false}
            data-testid="scene-page"
            className="pointer-events-none absolute inset-0 h-full w-full max-w-none"
          />
        )}
        {/* Ground line (track) under the pieces; outline pages draw their own. */}
        {!scene.pageSrc && (
          <span
            aria-hidden
            className="absolute block"
            style={{
              left: pct(scene.span[0] - view.x, view.w),
              width: pct(scene.span[1], view.w),
              top: pct(scene.ground - view.y, view.h),
              height: 3,
              backgroundColor: '#6b5a4c',
            }}
          />
        )}
        {scene.pieces.map((p) =>
          placed.has(p.id) && p.src ? (
            <img
              key={p.id}
              src={p.src}
              alt=""
              draggable={false}
              data-testid="scene-piece-placed"
              className="pointer-events-none absolute max-w-none animate-pop-in"
              style={boxStyle(p.box)}
            />
          ) : scene.pageSrc ? (
            // The page already shows the dashed slot; this only marks where it is.
            <span
              key={p.id}
              aria-hidden
              data-testid="scene-ghost"
              data-piece={p.id}
              className="absolute block"
              style={boxStyle(p.box)}
            />
          ) : p.src ? (
            <GhostOutline key={p.id} src={p.src} piece={p.id} style={boxStyle(p.box)} />
          ) : null,
        )}
        {complete && reward?.src && (
          <img
            src={reward.src}
            alt=""
            data-testid="scene-reward"
            className="pointer-events-none absolute right-[-6%] top-[-14%] w-[26%] max-w-none animate-pop-in"
            style={{ transform: 'rotate(-10deg)' }}
          />
        )}
      </div>
      {waiting.length > 0 && (
        <div className="flex flex-wrap items-center gap-3" data-testid="scene-tray">
          <span className="text-xs font-extrabold" style={{ color: '#6b5a4c' }}>
            {t.stickerBook.sceneHint}
          </span>
          {waiting.map((p) => (
            <button
              key={p.id}
              type="button"
              data-testid="scene-piece"
              data-piece={p.id}
              aria-label={p.id}
              onPointerDown={(e) => start(p.id, e)}
              className="h-16 w-16 touch-none cursor-grab"
              style={{ opacity: drag?.item === p.id && drag.moved ? 0.3 : 1 }}
            >
              <img src={p.src} alt="" draggable={false} className="pointer-events-none h-full w-full" />
            </button>
          ))}
        </div>
      )}
      {complete && (
        <p className="text-center text-sm font-black" style={{ color: INK }}>
          {t.stickerBook.sceneDone}
        </p>
      )}
      {dragged?.src && drag && (
        <img
          src={dragged.src}
          alt=""
          aria-hidden
          className="pointer-events-none fixed z-[60] max-w-none"
          style={{
            width: ghostPx,
            height: ghostPx,
            left: drag.x - ghostPx / 2,
            top: drag.y - ghostPx / 2,
          }}
        />
      )}
    </div>
  );
}
