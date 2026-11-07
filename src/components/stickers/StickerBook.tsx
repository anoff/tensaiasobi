import { useEffect, useState, type ReactNode } from 'react';
import { copyCount, hasShiny, ownedIds, type StickerSave } from '../../data/stickerRules';
import {
  GENERAL_STICKERS,
  SHELF_SLOTS,
  SCENE_PIECES,
  SHELF_STICKERS,
  SHELVES,
  characterArt,
  characterForShelf,
  collectibleById,
  moodsForShelf,
  shelfEarned,
  shelfTotal,
  BOOK_TAB_ICONS,
  PRINT_ICON,
  bookTotals,
  stickerLook,
  stickerTilt,
  type Collectible,
} from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CATEGORY_EMOJI, categoryFill } from '../../theme/categories';
import { BUTTER, CHALK, INK, hardShadow } from '../../theme/blockTable';
import { EmptySlot, Silhouette, StickerImage } from './StickerImage';
import { PageEditor, type PageEdits } from './PageEditor';
import { ScenePicker } from './ScenePicker';
import { StickerDetail } from './StickerDetail';
import { PrintDialog } from './PrintDialog';
import { HomeButton } from '../HomeButton';
import { HoldToConfirmButton } from '../HoldToConfirmButton';

interface StickerBookProps {
  book: StickerSave;
  stars: number;
  onBuyAccessory: (accessoryId: string) => boolean;
  /** Accessories go on one placed copy (by uid). */
  onPlaceAccessory: (uid: string, accessoryId: string, x: number, y: number) => void;
  onRemoveAccessory: (uid: string, accessoryId: string) => void;
  pageEdits: PageEdits;
  onSeen: () => void;
  playPop: () => void;
  onHome: () => void;
  /** The app's star pill (and session badges), shown at the end of the book's own top bar. */
  status: ReactNode;
}

const SLOT_PX = 68;
type Tab = 'pages' | 'collection';
const TABS: Tab[] = ['pages', 'collection'];

export default function StickerBook({
  book,
  stars,
  onBuyAccessory,
  onPlaceAccessory,
  onRemoveAccessory,
  pageEdits,
  onSeen,
  playPop,
  onHome,
  status,
}: StickerBookProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('collection');
  const [openId, setOpenId] = useState<string | null>(null);
  /** Placed copy whose accessories are being edited. */
  const [dressUid, setDressUid] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(Math.max(0, book.pages.length - 1));
  const [adding, setAdding] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [printing, setPrinting] = useState(false);
  // Remember what was new when the book opened, then mark it seen.
  const [newIds] = useState(() => new Set(book.copies.slice(book.seenCount).map((c) => c.id)));
  useEffect(() => {
    onSeen();
  }, [onSeen]);
  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [removed]);

  const earned = new Set(ownedIds(book));
  const totals = bookTotals(book);
  const open = openId ? collectibleById(openId) : undefined;
  const dressCopy = dressUid ? book.copies.find((c) => c.uid === dressUid) : undefined;
  const dressed = dressCopy ? collectibleById(dressCopy.id) : undefined;

  const slot = (c: Collectible | undefined, key: string) => {
    if (!c || !earned.has(c.id) || !c.src) {
      return (
        <span key={key} className="flex items-center justify-center" style={{ width: SLOT_PX, height: SLOT_PX }}>
          {c?.src ? (
            <Silhouette src={c.src} size={SLOT_PX} tilt={stickerTilt(c.id)} testId="sticker-slot-empty" />
          ) : (
            <EmptySlot size={SLOT_PX - 8} testId="sticker-slot-empty" />
          )}
        </span>
      );
    }
    return (
      <button
        key={key}
        type="button"
        data-testid="sticker-slot"
        data-sticker={c.id}
        onClick={() => {
          playPop();
          setOpenId(c.id);
        }}
        className="relative flex items-center justify-center outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70"
        style={{ width: SLOT_PX, height: SLOT_PX }}
      >
        <StickerImage
          {...stickerLook(c, hasShiny(book, c.id))}
          size={SLOT_PX}
          tilt={stickerTilt(c.id)}
          shiny={hasShiny(book, c.id)}
          count={copyCount(book, c.id)}
        />
        {newIds.has(c.id) && (
          <span
            className="absolute -right-1 -top-1 rounded-full border-2 px-1.5 text-[10px] font-black leading-4"
            style={{ backgroundColor: '#ff4d3a', borderColor: INK, color: '#fff' }}
          >
            {t.stickerBook.newBadge}
          </span>
        )}
      </button>
    );
  };

  const shelfCard = 'overflow-hidden rounded-[2rem] border-[3px]';
  const scroll = 'min-h-0 w-full flex-1 space-y-4 overflow-y-auto overscroll-y-contain pb-4 md:mx-auto md:max-w-md';

  return (
    // Collection scrolls inside; the nested Add page picker uses the whole screen's scroll area.
    <div
      className={`mx-auto flex w-full max-w-md flex-1 flex-col select-none md:max-w-3xl ${adding ? '' : 'min-h-0'}`}
      data-testid="sticker-book"
      data-page-scroll={adding ? 'true' : undefined}
    >
      <div className="flex h-12 shrink-0 items-center gap-1.5 narrow:gap-1" data-testid="book-top-bar">
        <HomeButton data-testid="home-button" onClick={onHome} className="!h-10 !w-10 shrink-0 !p-0 !text-lg" />
        <h2
          className="ml-1 min-w-0 truncate text-lg font-black tracking-tight narrow:ml-0 narrow:text-sm narrow:tracking-tighter"
          style={{ color: INK }}
        >
          {t.stickerBook.title}
        </h2>
        <span
          className="shrink-0 text-xs font-extrabold tabular-nums narrow:text-[11px]"
          style={{ color: '#6b5a4c' }}
          data-testid="sticker-book-count"
          aria-label={t.stickerBook.count.replace('{n}', String(totals.earned)).replace('{total}', String(totals.total))}
        >
          {totals.earned}/{totals.total}
        </span>
        <span className="flex-1" />
        {/* Parent gate: the same 2 s hold as the other grown-up actions. */}
        <HoldToConfirmButton
          data-testid="page-print"
          aria-label={t.stickerBook.printHold}
          duration={2000}
          onConfirm={() => setPrinting(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-[#2a1c14] bg-white shadow-[2px_3px_0_0_#2a1c14] narrow:h-9 narrow:w-9"
          progressClassName="bg-[#ffc21a]"
        >
          {() => <img src={PRINT_ICON} alt="" aria-hidden draggable={false} className="pointer-events-none h-6 w-6" />}
        </HoldToConfirmButton>
        <div className="flex shrink-0 items-center gap-1.5">{status}</div>
      </div>

      <div
        className="grid h-10 shrink-0 grid-cols-2 gap-1 rounded-full border-[3px] p-0.5"
        role="tablist"
        style={{ borderColor: INK, backgroundColor: CHALK }}
      >
        {TABS.map((id) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={on}
              data-testid={`book-tab-${id}`}
              onClick={() => {
                if (!on) playPop();
                setAdding(false);
                setTab(id);
              }}
              className="flex min-w-0 items-center justify-center gap-1 rounded-full border-2 px-1 text-xs font-black leading-none narrow:gap-0.5 narrow:px-0.5 narrow:text-[11px] narrow:tracking-tight"
              style={{
                backgroundColor: on ? BUTTER : 'transparent',
                borderColor: on ? INK : 'transparent',
                color: INK,
              }}
            >
              {BOOK_TAB_ICONS[id] && (
                <img src={BOOK_TAB_ICONS[id]} alt="" aria-hidden className="pointer-events-none h-6 w-6 shrink-0 narrow:h-[18px] narrow:w-[18px]" />
              )}
              <span className="min-w-0 truncate">
                {t.stickerBook[id === 'pages' ? 'tabPages' : 'tabCollection']}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'pages' && !adding && (
        <PageEditor
          key={book.pages[pageIndex]?.id ?? 'empty'}
          book={book}
          edits={pageEdits}
          index={pageIndex}
          onIndex={setPageIndex}
          playPop={playPop}
          onDress={(uid) => setDressUid(uid)}
          onNewPage={() => { setRemoved(false); setAdding(true); }}
          onDeleted={(nextIndex) => { setDressUid(null); setPageIndex(nextIndex); setRemoved(true); }}
        />
      )}

      {removed && tab === 'pages' && !adding && <p role="status" className="shrink-0 py-1 text-center text-xs font-extrabold">{t.stickerBook.pageRemoved}</p>}
      {tab === 'collection' && (
        <div className={`${scroll} mt-2`} data-testid="book-collection">
          {SHELVES.map((shelf) => {
            const fill = shelf === 'play' ? CHALK : categoryFill(shelf, 0);
            const stickers = SHELF_STICKERS[shelf];
            const moods = moodsForShelf(shelf);
            const character = characterForShelf(shelf);
            const characterSrc = character ? characterArt(character.id, 'idle') : undefined;
            return (
              <section
                key={shelf}
                data-testid={`book-shelf-${shelf}`}
                className={shelfCard}
                style={{ borderColor: INK, boxShadow: hardShadow(), backgroundColor: '#fff8ec' }}
              >
                <header
                  className="flex items-center justify-between border-b-[3px] px-4 py-2"
                  style={{ backgroundColor: fill, borderColor: INK }}
                >
                  <span className="flex items-center gap-2 text-lg font-black" style={{ color: INK }}>
                    <span aria-hidden>{CATEGORY_EMOJI[shelf]}</span>
                    {t.menu.categories[shelf]}
                  </span>
                  <span
                    className="rounded-full border-2 px-2.5 text-sm font-black tabular-nums"
                    style={{ backgroundColor: '#fff', borderColor: INK, color: INK }}
                    data-testid={`book-shelf-count-${shelf}`}
                  >
                    {shelfEarned(book, shelf)} / {shelfTotal(shelf)}
                  </span>
                </header>
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-4 justify-items-center gap-y-2" data-testid={`book-stickers-${shelf}`}>
                    {Array.from({ length: SHELF_SLOTS }, (_, i) => slot(stickers[i], `${shelf}-${i}`))}
                  </div>

                  {SCENE_PIECES[shelf].length > 0 && (
                    <div className="border-t-2 border-dashed pt-3" style={{ borderColor: '#d9cfc4' }}>
                      <div className="mb-1 text-xs font-black" style={{ color: INK }}>
                        {t.stickerBook.scenePieces}
                      </div>
                      <div className="grid grid-cols-4 justify-items-center" data-testid={`book-scene-pieces-${shelf}`}>
                        {SCENE_PIECES[shelf].map((p) => slot(p, p.id))}
                      </div>
                    </div>
                  )}

                  <div className="border-t-2 border-dashed pt-3" style={{ borderColor: '#d9cfc4' }}>
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center"
                        data-testid={`book-character-${character?.id ?? shelf}`}
                        data-has-art={String(Boolean(characterSrc))}
                      >
                        {characterSrc ? (
                          <img src={characterSrc} alt="" aria-hidden className="pointer-events-none h-10 w-10" />
                        ) : (
                          <EmptySlot size={34} />
                        )}
                      </span>
                      <span className="text-xs font-black" style={{ color: INK }}>
                        {character ? `${t.stickerBook.characters[character.id]} · ` : ''}
                        {t.stickerBook.moods}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 justify-items-center" data-testid={`book-moods-${shelf}`}>
                      {moods.map((m) => slot(m, m.id))}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
          {GENERAL_STICKERS.some((g) => g.id !== 'general_star' && earned.has(g.id)) && (
            <section
              data-testid="book-specials"
              className="rounded-[2rem] border-[3px] p-3"
              style={{ borderColor: INK, boxShadow: hardShadow(), backgroundColor: '#fff8ec' }}
            >
              <h3 className="mb-2 text-lg font-black" style={{ color: INK }}>
                ✨ {t.stickerBook.specials}
              </h3>
              <div className="grid grid-cols-4 justify-items-center">
                {GENERAL_STICKERS.filter((g) => g.id !== 'general_star' && earned.has(g.id)).map((g) => slot(g, g.id))}
              </div>
            </section>
          )}
        </div>
      )}

      {adding && (
        <ScenePicker
          book={book}
          onCancel={() => setAdding(false)}
          onPick={(bg) => {
            if (!pageEdits.addPage(bg)) return false;
            playPop();
            setPageIndex(book.pages.length);
            setAdding(false);
            return true;
          }}
        />
      )}

      {printing && (
        <PrintDialog
          book={book}
          page={book.pages[Math.min(pageIndex, book.pages.length - 1)]}
          pageNumber={Math.min(pageIndex, book.pages.length - 1) + 1}
          onClose={() => setPrinting(false)}
        />
      )}
      {open && (
        <StickerDetail
          sticker={open}
          src={stickerLook(open, hasShiny(book, open.id)).src}
          viewOnly
          placements={[]}
          ownedAccessories={book.ownedAccessories}
          stars={stars}
          onBuy={onBuyAccessory}
          onPlace={() => {}}
          onRemove={() => {}}
          onClose={() => {
            playPop();
            setOpenId(null);
          }}
          playPop={playPop}
        />
      )}
      {dressCopy && dressed && (
        <StickerDetail
          sticker={dressed}
          src={stickerLook(dressed, dressCopy.shiny).src}
          placements={book.placements[dressCopy.uid] ?? []}
          ownedAccessories={book.ownedAccessories}
          stars={stars}
          onBuy={onBuyAccessory}
          onPlace={(acc, x, y) => onPlaceAccessory(dressCopy.uid, acc, x, y)}
          onRemove={(acc) => onRemoveAccessory(dressCopy.uid, acc)}
          onClose={() => {
            playPop();
            setDressUid(null);
          }}
          playPop={playPop}
        />
      )}
    </div>
  );
}
