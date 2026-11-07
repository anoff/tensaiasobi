import { useLayoutEffect, useRef, useState } from 'react';
import {
  canAddPage,
  PAGE_ASPECT,
  PAGE_SIZE_STEPS,
  freeCopies,
  type PageBackground,
  type PagePlacement,
  type SizeStep,
  type StickerSave,
} from '../../data/stickerRules';
import { collectibleById, stickerLook, stickerTilt } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { BUTTER, CHALK, INK, PAPER, hardShadow } from '../../theme/blockTable';
import { BLANK_PAGE_FILL } from '../../data/sceneArt';
import { SceneBackground } from './SceneBackground';
import { CountBadge, StickerImage } from './StickerImage';
import { usePointerDrag } from './usePointerDrag';
import { DeletePageDialog } from './DeletePageDialog';

export interface PageEdits {
  addPage: (background: PageBackground) => boolean;
  deletePage: (pageId: string) => boolean;
  place: (pageId: string, stickerId: string, x: number, y: number) => void;
  update: (pageId: string, uid: string, patch: Partial<Pick<PagePlacement, 'x' | 'y' | 'size' | 'rotation'>>) => void;
  remove: (pageId: string, uid: string) => void;
  reroll: (pageId: string) => void;
}

interface PageEditorProps {
  book: StickerSave;
  edits: PageEdits;
  /** Page on show (the book keeps it, so the print button in its top bar prints this page). */
  index: number;
  onIndex: (index: number) => void;
  /** Opens the accessory editor for one placed copy. */
  onDress: (uid: string) => void;
  /** Opens the New page picker. */
  onNewPage: () => void;
  onDeleted: (nextIndex: number) => void;
  playPop: () => void;
}

type DragItem = { kind: 'tray'; id: string } | { kind: 'placed'; uid: string } | { kind: 'rotate'; uid: string };

const TRAY_PX = 56;
const TRAY_OPEN = 72;
const TRAY_SHUT = 24;
/** Space between tabs, page and tray. */
const GAP = 8;
/** Tailwind `md`: the tray moves beside the page. */
const WIDE_QUERY = '(min-width: 768px)';

/** My pages: the biggest 9:16 page that fits, arrows on its edges, and a docked tray of free copies. */
export function PageEditor({ book, edits, index: rawIndex, onIndex, onDress, onNewPage, onDeleted, playPop }: PageEditorProps) {
  const { t } = useTranslation();
  const index = Math.max(0, Math.min(rawIndex, book.pages.length - 1));
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [trayOpen, setTrayOpen] = useState(true);
  const areaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  /** Free space under the tabs; on wide screens the tray stands beside the page instead of under it. */
  const [area, setArea] = useState({ w: 0, h: 0, wide: false });
  // The 9:16 page takes whatever the tray and the 8 px gap leave, limited by width or height, whichever bites first.
  const trayExtent = (trayOpen ? TRAY_OPEN : TRAY_SHUT) + GAP;
  const binderGutter = area.w <= 288 ? 22 : 28;
  const fitW = (area.wide ? area.w - trayExtent : area.w) - binderGutter - 4;
  const fitH = area.wide ? area.h - 4 : area.h - trayExtent - 4;
  const boardWidth = Math.max(0, Math.floor(Math.min(fitW, fitH * PAGE_ASPECT)));
  const boardHeight = Math.max(0, Math.min(Math.round(boardWidth / PAGE_ASPECT), Math.floor(fitH)));
  const page = book.pages[index];

  // Measured before paint, so the page never shows at 0 px for a frame.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () =>
      setArea({ w: el.clientWidth, h: el.clientHeight, wide: window.matchMedia(WIDE_QUERY).matches });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const canAdd = canAddPage(book);

  const actionStyle = { backgroundColor: CHALK, borderColor: INK, color: INK, boxShadow: hardShadow(2, 3) };
  const action = 'min-h-11 rounded-xl border-[3px] px-3 text-sm font-black focus-visible:ring-4 focus-visible:ring-amber-400/70';

  const draggedTray = drag?.moved && drag.item.kind === 'tray' ? collectibleById(drag.item.id) : undefined;
  const draggedPlaced = drag?.moved && drag.item.kind === 'placed' ? drag.item.uid : null;

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2" data-testid="my-pages">
      {page && <>
        <div className="flex shrink-0 items-center justify-between gap-3 pb-1 pr-1" data-testid="page-actions">
          {canAdd ? <button type="button" data-testid="page-new" className={action}
            style={{ ...actionStyle, backgroundColor: BUTTER }} onClick={onNewPage}>
            + {t.stickerBook.newPage}
          </button> : <span className="text-xs font-extrabold">{t.stickerBook.pagesFull}</span>}
          <button type="button" data-testid="page-delete" className={action} style={actionStyle}
            onClick={() => setDeleting(true)}>🗑 {t.stickerBook.deletePage}</button>
        </div>
        <div className="flex h-10 shrink-0 items-center justify-center gap-3" data-testid="page-navigation">
          <button type="button" data-testid="page-prev" aria-label="‹" disabled={index === 0}
            className={`${action} min-w-11 disabled:opacity-30`} style={actionStyle}
            onClick={() => onIndex(index - 1)}>‹</button>
          <span data-testid="page-label" className="text-xs font-black tabular-nums"
            aria-label={t.stickerBook.pageLabel.replace('{n}', String(index + 1)).replace('{total}', String(book.pages.length))}>
            {index + 1}/{book.pages.length}
          </span>
          <button type="button" data-testid="page-next" aria-label="›" disabled={index >= book.pages.length - 1}
            className={`${action} min-w-11 disabled:opacity-30`} style={actionStyle}
            onClick={() => onIndex(index + 1)}>›</button>
          {page.background !== 'blank' && <button type="button" data-testid="page-reroll" aria-label={t.stickerBook.reroll}
            className={action} style={actionStyle} onClick={() => edits.reroll(page.id)}>🎲</button>}
        </div>
      </>}
      <div ref={areaRef} className="flex min-h-0 flex-1 flex-col items-center gap-2 md:flex-row md:items-start md:justify-center">
      <div className="relative shrink-0" style={{ paddingLeft: binderGutter, paddingRight: 4, paddingBottom: 4 }} data-testid="page-binder">
        <div aria-hidden="true" data-testid="binder-rail" className="pointer-events-none absolute left-0 top-0 rounded-l-xl border-[3px] print:hidden"
          style={{ width: binderGutter - 8, height: boardHeight, backgroundColor: BUTTER, borderColor: INK, boxShadow: hardShadow(2, 3) }}>
          {[20, 50, 80].map((top) => <span key={top} className="absolute rounded-full border-[3px]"
            style={{ top: `${top}%`, left: '25%', width: binderGutter - 12, height: 12, transform: 'translateY(-50%)', backgroundColor: CHALK, borderColor: INK, boxShadow: hardShadow(1, 2) }} />)}
        </div>
        {!page ? (
          // Empty books stay empty until a theme is picked.
          <div
            className="relative flex flex-col items-center justify-center gap-3 rounded-2xl border-[3px] border-dashed p-4"
            style={{ width: boardWidth, height: boardHeight, backgroundColor: PAPER, borderColor: INK }}
            data-testid="page-choose"
          >
            <button
              type="button"
              data-testid="page-new"
              onClick={() => {
                playPop();
                onNewPage();
              }}
              className="flex items-center gap-2 rounded-full border-[3px] px-5 py-3 text-lg font-black"
              style={{ backgroundColor: BUTTER, borderColor: INK, color: INK, boxShadow: hardShadow(3, 4) }}
            >
              + {t.stickerBook.newPage}
            </button>
          </div>
        ) : (
          <div
            ref={boardRef}
            data-testid="page-board"
            data-page={page.id}
            data-background={page.background === 'blank' ? 'blank' : page.background.theme}
            className="relative overflow-hidden rounded-2xl border-[3px] touch-none"
            style={{
              width: boardWidth,
              height: boardHeight,
              // A Blank page is opaque white; a scene page's canvas covers its paper.
              backgroundColor: page.background === 'blank' ? BLANK_PAGE_FILL : PAPER,
              borderColor: INK,
              boxShadow: hardShadow(3, 4),
            }}
            onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            {page.background !== 'blank' && (
              <>
                <SceneBackground background={page.background} width={boardWidth - 6} height={boardHeight - 6} />
              </>
            )}
            {page.stickers.length === 0 && (
              <p
                data-testid="page-empty-hint"
                className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-base font-extrabold"
                style={{ color: INK, opacity: 0.35 }}
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
        )}
      </div>

      {/* Docked tray: 72 px tall and page-wide under the page (beside it on wide screens); the grab handle folds it to 24 px. */}
      <div
        ref={trayRef}
        data-testid="page-tray"
        data-open={String(trayOpen)}
        className={`flex w-full shrink-0 overflow-hidden rounded-2xl border-[3px] md:flex-col ${
          trayOpen ? 'h-[72px] md:w-[72px]' : 'h-6 md:w-6'
        }`}
        style={{
          backgroundColor: CHALK,
          borderColor: INK,
          // Under the page it is exactly as wide as the page (centred by the column), so a height-bound page
          // does not sit on a wider tray; beside the page it keeps its fixed width and takes the page height.
          width: area.wide || !boardWidth ? undefined : boardWidth,
          height: area.wide ? boardHeight : undefined,
        }}
      >
        <button
          type="button"
          data-testid="tray-handle"
          aria-label={t.stickerBook.trayHandle}
          aria-expanded={trayOpen}
          className={`flex shrink-0 items-center justify-center ${trayOpen ? 'w-5 md:h-5 md:w-auto' : 'flex-1'}`}
          onClick={() => {
            playPop();
            setTrayOpen((o) => !o);
          }}
        >
          <span
            className={`rounded-full ${trayOpen ? 'h-8 w-1.5 md:h-1.5 md:w-8' : 'h-1.5 w-10 md:h-10 md:w-1.5'}`}
            style={{ backgroundColor: INK, opacity: 0.45 }}
          />
        </button>
        {trayOpen && (
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5 overflow-x-auto overscroll-x-contain pr-1.5 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:px-0 md:pb-1.5">
            {tray.length === 0 && (
              <p className="w-full text-center text-xs font-extrabold leading-tight" style={{ color: '#6b5a4c' }}>
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
                  className="relative shrink-0 touch-pan-x md:touch-pan-y"
                  style={{ width: TRAY_PX, height: TRAY_PX }}
                  onPointerDown={(e) => start({ kind: 'tray', id }, e)}
                >
                  <StickerImage {...stickerLook(c, shiny)} size={TRAY_PX} tilt={stickerTilt(id)} shiny={shiny} />
                  {free.length > 1 && <CountBadge count={free.length} testId="tray-count" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      </div>
      {page && deleting && <DeletePageDialog book={book} page={page}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          if (!edits.deletePage(page.id)) return false;
          onDeleted(Math.max(0, Math.min(index, book.pages.length - 2)));
          return true;
        }} />}
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
