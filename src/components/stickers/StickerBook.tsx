import { useEffect, useState } from 'react';
import { copyCount, hasShiny, ownedIds, type StickerSave } from '../../data/stickerRules';
import {
  GENERAL_STICKERS,
  SHELF_SLOTS,
  SHELF_STICKERS,
  SHELVES,
  characterArt,
  characterForShelf,
  collectibleById,
  moodsForShelf,
  sceneForShelf,
  shelfEarned,
  shelfTotal,
  BOOK_TAB_ICONS,
  bookTotals,
  stickerLook,
  stickerTilt,
  type Collectible,
} from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CATEGORY_EMOJI, categoryFill } from '../../theme/categories';
import { BUTTER, CHALK, INK, PAPER, hardShadow } from '../../theme/blockTable';
import { EmptySlot, Silhouette, StickerImage } from './StickerImage';
import { PageEditor, type PageEdits } from './PageEditor';
import { SceneBoard } from './SceneBoard';
import { StickerDetail } from './StickerDetail';

interface StickerBookProps {
  book: StickerSave;
  stars: number;
  onBuyAccessory: (accessoryId: string) => boolean;
  /** Accessories go on one placed copy (by uid). */
  onPlaceAccessory: (uid: string, accessoryId: string, x: number, y: number) => void;
  onRemoveAccessory: (uid: string, accessoryId: string) => void;
  pageEdits: PageEdits;
  onPlaceScenePiece: (pieceId: string) => void;
  onSeen: () => void;
  playPop: () => void;
  playSuccess: () => void;
}

const SLOT_PX = 68;
type Tab = 'pages' | 'collection' | 'scenes';
const TABS: Tab[] = ['pages', 'collection', 'scenes'];

export default function StickerBook({
  book,
  stars,
  onBuyAccessory,
  onPlaceAccessory,
  onRemoveAccessory,
  pageEdits,
  onPlaceScenePiece,
  onSeen,
  playPop,
  playSuccess,
}: StickerBookProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('collection');
  const [openId, setOpenId] = useState<string | null>(null);
  /** Placed copy whose accessories are being edited. */
  const [dressUid, setDressUid] = useState<string | null>(null);
  // Remember what was new when the book opened, then mark it seen.
  const [newIds] = useState(() => new Set(book.copies.slice(book.seenCount).map((c) => c.id)));
  useEffect(() => {
    onSeen();
  }, [onSeen]);

  const earned = new Set(ownedIds(book));
  const totals = bookTotals(book);
  const open = openId ? collectibleById(openId) : undefined;
  const dressCopy = dressUid ? book.copies.find((c) => c.uid === dressUid) : undefined;
  const dressed = dressCopy ? collectibleById(dressCopy.id) : undefined;
  const panda = characterArt('panda', 'idle');

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

  return (
    <div className="mx-auto w-full max-w-md space-y-5 short:space-y-3 pb-8 short:pb-2 select-none" data-testid="sticker-book">
      <div className="flex items-center gap-3">
        {panda && (
          <img
            src={panda}
            alt=""
            aria-hidden
            className="pointer-events-none h-20 w-20 shrink-0 short:h-14 short:w-14"
            data-testid="book-panda"
          />
        )}
        <div>
          <h2 className="text-3xl short:text-2xl font-black tracking-tight" style={{ color: INK }}>
            {t.stickerBook.title}
          </h2>
          <p className="text-sm font-extrabold" style={{ color: '#6b5a4c' }} data-testid="sticker-book-count">
            {t.stickerBook.count.replace('{n}', String(totals.earned)).replace('{total}', String(totals.total))}
            {' · '}
            {totals.earned > 0 ? t.stickerBook.tapHint : t.stickerBook.empty}
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-1.5 rounded-full border-[3px] p-1"
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
                setTab(id);
              }}
              className="flex items-center justify-center gap-1 rounded-full border-[3px] px-1 py-1 text-xs font-black leading-tight"
              style={{
                backgroundColor: on ? BUTTER : 'transparent',
                borderColor: on ? INK : 'transparent',
                boxShadow: on ? hardShadow(2, 3) : 'none',
                color: INK,
              }}
            >
              {BOOK_TAB_ICONS[id] && (
                <img src={BOOK_TAB_ICONS[id]} alt="" aria-hidden className="pointer-events-none h-7 w-7 shrink-0" />
              )}
              <span className="min-w-0">
                {t.stickerBook[id === 'pages' ? 'tabPages' : id === 'collection' ? 'tabCollection' : 'tabScenes']}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'pages' && (
        <PageEditor book={book} edits={pageEdits} playPop={playPop} onDress={(uid) => setDressUid(uid)} />
      )}

      {tab === 'collection' &&
        SHELVES.map((shelf) => {
          const fill = shelf === 'play' ? CHALK : categoryFill(shelf, 0);
          const stickers = SHELF_STICKERS[shelf];
          const moods = moodsForShelf(shelf);
          const character = characterForShelf(shelf);
          const characterSrc = character ? characterArt(character.id, 'idle') : undefined;
          return (
            <section
              key={shelf}
              data-testid={`book-shelf-${shelf}`}
              className="overflow-hidden rounded-[2rem] border-[3px]"
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

      {tab === 'scenes' &&
        SHELVES.map((shelf) => {
          const scene = sceneForShelf(shelf);
          return (
            <section
              key={shelf}
              data-testid={`book-scenes-${shelf}`}
              className="overflow-hidden rounded-[2rem] border-[3px]"
              style={{ borderColor: INK, boxShadow: hardShadow(), backgroundColor: '#fff8ec' }}
            >
              <header
                className="flex items-center gap-2 border-b-[3px] px-4 py-2 text-lg font-black"
                style={{
                  backgroundColor: shelf === 'play' ? CHALK : categoryFill(shelf, 0),
                  borderColor: INK,
                  color: INK,
                }}
              >
                <span aria-hidden>{CATEGORY_EMOJI[shelf]}</span>
                {t.menu.categories[shelf]}
              </header>
              <div className="p-3">
                {scene ? (
                  <SceneBoard
                    scene={scene}
                    book={book}
                    onPlacePiece={onPlaceScenePiece}
                    playPop={playPop}
                    playSuccess={playSuccess}
                  />
                ) : (
                  <div
                    className="flex h-20 items-center justify-center rounded-2xl border-2 border-dashed text-sm font-extrabold"
                    style={{ borderColor: '#b8aea3', backgroundColor: PAPER, color: '#6b5a4c' }}
                    data-testid={`scene-coming-${shelf}`}
                  >
                    {t.stickerBook.comingSoon}
                  </div>
                )}
              </div>
            </section>
          );
        })}

      {tab === 'collection' && GENERAL_STICKERS.some((g) => g.id !== 'general_star' && earned.has(g.id)) && (
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
