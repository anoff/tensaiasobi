import { useEffect, useState } from 'react';
import type { StickerSave } from '../../data/stickerRules';
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
  bookTotals,
  stickerTilt,
  type Collectible,
} from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CATEGORY_EMOJI, categoryFill } from '../../theme/categories';
import { CHALK, INK, PAPER, hardShadow } from '../../theme/blockTable';
import { EmptySlot, StickerImage } from './StickerImage';
import { SceneBoard } from './SceneBoard';
import { StickerDetail } from './StickerDetail';

interface StickerBookProps {
  book: StickerSave;
  stars: number;
  onBuyAccessory: (accessoryId: string) => boolean;
  onPlaceAccessory: (stickerId: string, accessoryId: string, x: number, y: number) => void;
  onRemoveAccessory: (stickerId: string, accessoryId: string) => void;
  onPlaceScenePiece: (pieceId: string) => void;
  onSeen: () => void;
  playPop: () => void;
  playSuccess: () => void;
}

const SLOT_PX = 68;

export default function StickerBook({
  book,
  stars,
  onBuyAccessory,
  onPlaceAccessory,
  onRemoveAccessory,
  onPlaceScenePiece,
  onSeen,
  playPop,
  playSuccess,
}: StickerBookProps) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  // Remember what was new when the book opened, then mark it seen.
  const [newIds] = useState(() => new Set(book.earned.slice(book.seenCount)));
  useEffect(() => {
    onSeen();
  }, [onSeen]);

  const earned = new Set(book.earned);
  const totals = bookTotals(book);
  const open = openId ? collectibleById(openId) : undefined;
  const panda = characterArt('panda', 'idle');

  const slot = (c: Collectible | undefined, key: string) => {
    if (!c || !earned.has(c.id) || !c.src) {
      return (
        <span key={key} className="flex items-center justify-center" style={{ width: SLOT_PX, height: SLOT_PX }}>
          <EmptySlot size={SLOT_PX - 8} testId="sticker-slot-empty" />
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
        <StickerImage src={c.src} size={SLOT_PX} placements={book.placements[c.id]} tilt={stickerTilt(c.id)} />
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
    <div className="mx-auto w-full max-w-md space-y-5 pb-8 select-none" data-testid="sticker-book">
      <div className="flex items-center gap-3">
        {panda && <img src={panda} alt="" aria-hidden className="pointer-events-none h-20 w-20 shrink-0" data-testid="book-panda" />}
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

      {SHELVES.map((shelf) => {
        const fill = shelf === 'play' ? CHALK : categoryFill(shelf, 0);
        const stickers = SHELF_STICKERS[shelf];
        const moods = moodsForShelf(shelf);
        const character = characterForShelf(shelf);
        const characterSrc = character ? characterArt(character.id, 'idle') : undefined;
        const scene = sceneForShelf(shelf);
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

              <div className="border-t-2 border-dashed pt-3" style={{ borderColor: '#d9cfc4' }}>
                <p className="mb-2 text-xs font-black" style={{ color: INK }}>
                  {t.stickerBook.scene}
                </p>
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

      {open && (
        <StickerDetail
          sticker={open}
          placements={book.placements[open.id] ?? []}
          ownedAccessories={book.ownedAccessories}
          stars={stars}
          onBuy={onBuyAccessory}
          onPlace={(acc, x, y) => onPlaceAccessory(open.id, acc, x, y)}
          onRemove={(acc) => onRemoveAccessory(open.id, acc)}
          onClose={() => {
            playPop();
            setOpenId(null);
          }}
          playPop={playPop}
        />
      )}
    </div>
  );
}
