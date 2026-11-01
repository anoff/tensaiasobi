import { useEffect, useRef, useState } from 'react';
import {
  MAX_PAGES,
  PAGE_SIZE_STEPS,
  freeCopies,
  type PageBackground,
  type PagePlacement,
  type SizeStep,
  type StickerSave,
} from '../../data/stickerRules';
import { SHELVES, collectibleById, sceneForShelf, stickerLook, stickerTilt } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CATEGORY_EMOJI } from '../../theme/categories';
import { BUTTER, CHALK, INK, PAPER, hardShadow } from '../../theme/blockTable';
import { CountBadge, StickerImage } from './StickerImage';
import { usePointerDrag } from './usePointerDrag';

export interface PageEdits {
  addPage: (background: PageBackground) => void;
  place: (pageId: string, stickerId: string, x: number, y: number) => void;
  update: (pageId: string, uid: string, patch: Partial<Pick<PagePlacement, 'x' | 'y' | 'size' | 'rotation'>>) => void;
  remove: (pageId: string, uid: string) => void;
}

interface PageEditorProps {
  book: StickerSave;
  edits: PageEdits;
  /** Opens the accessory editor for one placed copy. */
  onDress: (uid: string) => void;
  playPop: () => void;
}

type DragItem = { kind: 'tray'; id: string } | { kind: 'placed'; uid: string } | { kind: 'rotate'; uid: string };

const TRAY_PX = 56;
/** Page shape (width / height) for paper and scene backgrounds alike. */
const PAGE_ASPECT = 4 / 3;

/** My pages: a pager, the page board and a tray of copies still free to stick. */
export function PageEditor({ book, edits, onDress, playPop }: PageEditorProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(Math.max(0, book.pages.length - 1));
  const [choosing, setChoosing] = useState(book.pages.length === 0);
  const [selected, setSelected] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(0);
  const page = book.pages[Math.min(index, book.pages.length - 1)];

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => setBoardWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [page?.id, choosing]);

  const local = (x: number, y: number) => {
    const r = boardRef.current?.getBoundingClientRect();
    return r ? { u: (x - r.left) / r.width, v: (y - r.top) / r.height, r } : null;
  };
  const inTray = (x: number, y: number) => {
    const r = trayRef.current?.getBoundingClientRect();
    return Boolean(r && x >= r.left && x <= r.right && y >= r.top - 8 && y <= r.bottom);
  };
  const onBoard = (u: number, v: number) => u >= 0 && u <= 1 && v >= 0 && v <= 1;
  const copyOf = (uid: string) => book.copies.find((c) => c.uid === uid);
  /** Board box while a rotate handle is held (read in the pointer handler, used for the live angle). */
  const [rotRect, setRotRect] = useState<DOMRect | null>(null);
  /** Rotation that puts the rotate handle (top-right corner, -45° at rest) under the finger. */
  const rotationAt = (pl: PagePlacement, x: number, y: number, r: DOMRect | null) => {
    if (!r) return pl.rotation;
    const deg = (Math.atan2(y - r.top - pl.y * r.height, x - r.left - pl.x * r.width) * 180) / Math.PI;
    return Math.round(deg + 45);
  };

  const { drag, start } = usePointerDrag<DragItem>((item, x, y, moved) => {
    if (!page) return;
    const p = local(x, y);
    if (item.kind === 'tray') {
      if (moved && !(p && onBoard(p.u, p.v))) return;
      playPop();
      // A tap sticks it in the middle; a drag sticks it where it lands.
      edits.place(page.id, item.id, moved && p ? p.u : 0.5, moved && p ? p.v : 0.5);
      return;
    }
    const pl = page.stickers.find((s) => s.uid === item.uid);
    if (!pl) return;
    if (item.kind === 'rotate') {
      if (moved) edits.update(page.id, pl.uid, { rotation: rotationAt(pl, x, y, p?.r ?? null) });
      return;
    }
    if (!moved) {
      setSelected((s) => (s === pl.uid ? null : pl.uid));
      return;
    }
    if (inTray(x, y)) {
      playPop();
      setSelected(null);
      edits.remove(page.id, pl.uid);
    } else if (p && onBoard(p.u, p.v)) {
      edits.update(page.id, pl.uid, { x: p.u, y: p.v });
    }
  });

  // Tray: every owned sticker with a copy not on any page yet, with how many are left.
  const trayIds = [...new Set(book.copies.map((c) => c.id))].filter((id) => collectibleById(id)?.src);
  const tray = trayIds.map((id) => ({ id, free: freeCopies(book, id) })).filter((x) => x.free.length > 0);

  const pickBackground = (bg: PageBackground) => {
    playPop();
    edits.addPage(bg);
    setIndex(book.pages.length);
    setChoosing(false);
    setSelected(null);
  };
  const scenes = SHELVES.map((s) => sceneForShelf(s)).filter((s) => s !== undefined);
  const canAdd = book.pages.length < MAX_PAGES;

  const pagerButton =
    'flex h-10 min-w-10 items-center justify-center rounded-full border-[3px] px-2 text-base font-black disabled:opacity-40';
  const pagerStyle = { backgroundColor: '#fff', borderColor: INK, color: INK, boxShadow: hardShadow(2, 3) };

  const draggedTray = drag?.moved && drag.item.kind === 'tray' ? collectibleById(drag.item.id) : undefined;
  const draggedPlaced = drag?.moved && drag.item.kind === 'placed' ? drag.item.uid : null;

  return (
    <div className="space-y-2" data-testid="my-pages">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="page-prev"
          aria-label="‹"
          className={pagerButton}
          style={pagerStyle}
          disabled={choosing || index <= 0}
          onClick={() => {
            setIndex((i) => i - 1);
            setSelected(null);
          }}
        >
          ‹
        </button>
        <span className="text-sm font-black tabular-nums" style={{ color: INK }} data-testid="page-label">
          {page && !choosing
            ? t.stickerBook.pageLabel.replace('{n}', String(index + 1)).replace('{total}', String(book.pages.length))
            : t.stickerBook.newPage}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="page-next"
            aria-label="›"
            className={pagerButton}
            style={pagerStyle}
            disabled={choosing || index >= book.pages.length - 1}
            onClick={() => {
              setIndex((i) => i + 1);
              setSelected(null);
            }}
          >
            ›
          </button>
          <button
            type="button"
            data-testid="page-new"
            aria-label={t.stickerBook.newPage}
            className={pagerButton}
            style={{ ...pagerStyle, backgroundColor: BUTTER }}
            disabled={!canAdd}
            onClick={() => {
              playPop();
              setChoosing((c) => !c || book.pages.length === 0);
            }}
          >
            ＋
          </button>
        </div>
      </div>

      {choosing || !page ? (
        <div className="grid grid-cols-2 gap-3" data-testid="page-backgrounds">
          <button
            type="button"
            data-testid="page-bg-paper"
            onClick={() => pickBackground('paper')}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border-[3px] text-sm font-black"
            style={{
              aspectRatio: PAGE_ASPECT,
              backgroundColor: PAPER,
              borderColor: INK,
              color: INK,
              boxShadow: hardShadow(3, 4),
            }}
          >
            {t.stickerBook.paper}
          </button>
          {scenes.map((s) => (
            <button
              key={s.shelf}
              type="button"
              data-testid={`page-bg-${s.shelf}`}
              aria-label={t.menu.categories[s.shelf]}
              onClick={() => pickBackground(s.shelf)}
              className="relative overflow-hidden rounded-2xl border-[3px]"
              style={{
                aspectRatio: PAGE_ASPECT,
                backgroundColor: PAPER,
                borderColor: INK,
                boxShadow: hardShadow(3, 4),
              }}
            >
              <img src={s.pageSrc} alt="" aria-hidden className="pointer-events-none h-full w-full object-contain" />
              <span className="absolute left-1.5 top-1 text-base" aria-hidden>
                {CATEGORY_EMOJI[s.shelf]}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div
            ref={boardRef}
            data-testid="page-board"
            data-page={page.id}
            data-background={page.background}
            className="relative mx-auto overflow-hidden rounded-2xl border-[3px] touch-none"
            style={{
              aspectRatio: PAGE_ASPECT,
              // Fits a 320x568 phone: the board gives way to the tabs, pager and tray.
              width: `min(100%, calc((100svh - 340px) * ${PAGE_ASPECT}))`,
              backgroundColor: PAPER,
              borderColor: INK,
              boxShadow: hardShadow(3, 4),
            }}
            onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            {page.background !== 'paper' && (
              <img
                src={sceneForShelf(page.background)?.pageSrc}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            )}
            {page.stickers.length === 0 && (
              <p
                className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center text-sm font-extrabold"
                style={{ color: '#6b5a4c' }}
              >
                {t.stickerBook.pageHint}
              </p>
            )}
            {page.stickers.map((pl) => {
              const copy = copyOf(pl.uid);
              const c = copy && collectibleById(copy.id);
              if (!copy || !c) return null;
              const px = boardWidth * PAGE_SIZE_STEPS[pl.size];
              const isSel = selected === pl.uid;
              const rotation =
                drag?.item.kind === 'rotate' && drag.item.uid === pl.uid && drag.moved
                  ? rotationAt(pl, drag.x, drag.y, rotRect)
                  : pl.rotation;
              return (
                <div
                  key={pl.uid}
                  data-testid="page-sticker"
                  data-uid={pl.uid}
                  data-sticker={copy.id}
                  data-size={pl.size}
                  data-rotation={pl.rotation}
                  data-selected={String(isSel)}
                  className="absolute touch-none"
                  style={{
                    left: `${pl.x * 100}%`,
                    top: `${pl.y * 100}%`,
                    width: px,
                    height: px,
                    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                    opacity: draggedPlaced === pl.uid ? 0.3 : 1,
                    zIndex: isSel ? 2 : 1,
                  }}
                  onPointerDown={(e) => start({ kind: 'placed', uid: pl.uid }, e)}
                >
                  <StickerImage
                    {...stickerLook(c, copy.shiny)}
                    size={px}
                    placements={book.placements[pl.uid]}
                    tilt={stickerTilt(copy.id)}
                    shiny={copy.shiny}
                  />
                  {isSel && (
                    <>
                      <span
                        aria-hidden
                        data-testid="page-selection"
                        className="pointer-events-none absolute -inset-1.5 rounded-lg border-2 border-dashed"
                        style={{ borderColor: INK }}
                      />
                      <Handle
                        testId="handle-rotate"
                        label={t.stickerBook.turn}
                        className="-right-4 -top-4 cursor-grab"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setRotRect(boardRef.current?.getBoundingClientRect() ?? null);
                          start({ kind: 'rotate', uid: pl.uid }, e);
                        }}
                      >
                        ↻
                      </Handle>
                      <Handle
                        testId="handle-size"
                        label={t.stickerBook.size}
                        className="-bottom-4 -right-4"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          playPop();
                          edits.update(page.id, pl.uid, { size: ((pl.size + 1) % 3) as SizeStep });
                        }}
                      >
                        <span className="flex items-end gap-px" aria-hidden>
                          {[0, 1, 2].map((s) => (
                            <span
                              key={s}
                              className="w-1 rounded-sm"
                              style={{ height: 5 + s * 4, backgroundColor: s <= pl.size ? INK : '#b8aea3' }}
                            />
                          ))}
                        </span>
                      </Handle>
                      <Handle
                        testId="handle-accessory"
                        label={t.stickerBook.accessories}
                        className="-bottom-4 -left-4"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => {
                          playPop();
                          onDress(pl.uid);
                        }}
                      >
                        🎀
                      </Handle>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div
            ref={trayRef}
            data-testid="page-tray"
            className="flex min-h-[76px] items-center gap-2 overflow-x-auto overscroll-x-contain rounded-2xl border-[3px] px-2 py-1"
            style={{ backgroundColor: CHALK, borderColor: INK }}
          >
            {tray.length === 0 && (
              <p className="w-full text-center text-sm font-extrabold" style={{ color: '#6b5a4c' }}>
                {t.stickerBook.trayEmpty}
              </p>
            )}
            {tray.map(({ id, free }) => {
              const c = collectibleById(id);
              if (!c) return null;
              const shiny = free[0].shiny;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid="tray-sticker"
                  data-sticker={id}
                  data-free={free.length}
                  aria-label={id}
                  className="relative shrink-0 touch-pan-x"
                  style={{ width: TRAY_PX + 4, height: TRAY_PX + 4 }}
                  onPointerDown={(e) => start({ kind: 'tray', id }, e)}
                >
                  <StickerImage {...stickerLook(c, shiny)} size={TRAY_PX} tilt={stickerTilt(id)} shiny={shiny} />
                  {free.length > 1 && <CountBadge count={free.length} testId="tray-count" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      {draggedTray?.src && drag && (
        <img
          src={draggedTray.src}
          alt=""
          aria-hidden
          className="pointer-events-none fixed z-[60] max-w-none"
          style={{ width: 72, height: 72, left: drag.x - 36, top: drag.y - 36 }}
        />
      )}
      {draggedPlaced &&
        drag &&
        (() => {
          const copy = copyOf(draggedPlaced);
          const c = copy && collectibleById(copy.id);
          const pl = page?.stickers.find((s) => s.uid === draggedPlaced);
          if (!copy || !c || !pl) return null;
          const px = boardWidth * PAGE_SIZE_STEPS[pl.size];
          return (
            <div
              aria-hidden
              className="pointer-events-none fixed z-[60]"
              style={{
                width: px,
                height: px,
                left: drag.x - px / 2,
                top: drag.y - px / 2,
                transform: `rotate(${pl.rotation}deg)`,
              }}
            >
              <StickerImage
                {...stickerLook(c, copy.shiny)}
                size={px}
                placements={book.placements[pl.uid]}
                tilt={stickerTilt(copy.id)}
                shiny={copy.shiny}
              />
            </div>
          );
        })()}
    </div>
  );
}

function Handle({
  testId,
  label,
  className,
  children,
  onPointerDown,
  onClick,
}: {
  testId: string;
  label: string;
  className: string;
  children: React.ReactNode;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={`absolute flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-base font-black touch-none ${className}`}
      style={{ backgroundColor: BUTTER, borderColor: INK, color: INK, boxShadow: hardShadow(2, 3) }}
    >
      {children}
    </button>
  );
}
