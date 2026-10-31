import type { StickerSave } from '../../data/stickerRules';
import { characterArt, collectibleById, stickerTilt } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CHALK, CORAL, INK, hardShadow } from '../../theme/blockTable';
import { StickerImage } from './StickerImage';

interface StickerHomeCardProps {
  book: StickerSave;
  totals: { earned: number; total: number };
  onClick: () => void;
}

/** Home launcher for the Sticker Book: the host panda, the count, the newest stickers and a "+N" badge. */
export function StickerHomeCard({ book, totals, onClick }: StickerHomeCardProps) {
  const { t } = useTranslation();
  const panda = characterArt('panda', 'idle');
  const unseen = Math.max(0, book.earned.length - book.seenCount);
  const latest = book.earned
    .slice(-3)
    .map((id) => collectibleById(id))
    .filter((c) => c?.src && c.kind !== 'scene');

  return (
    <button
      type="button"
      data-testid="launch-sticker-book"
      onClick={onClick}
      className="relative flex w-full items-center gap-3 rounded-[1.6rem] border-[3px] px-3 py-2 text-left outline-none transition-transform active:translate-x-[5px] active:translate-y-[6px] active:[box-shadow:none] focus-visible:ring-4 focus-visible:ring-amber-400/70"
      style={{ backgroundColor: CHALK, borderColor: INK, boxShadow: hardShadow(), minHeight: '6rem' }}
    >
      {panda && <img src={panda} alt="" aria-hidden className="pointer-events-none h-20 w-20 shrink-0" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-black leading-tight" style={{ color: INK }}>
          {t.stickerBook.title}
        </span>
        <span className="text-sm font-extrabold tabular-nums" style={{ color: '#6b5a4c' }} data-testid="home-sticker-count">
          {t.stickerBook.count.replace('{n}', String(totals.earned)).replace('{total}', String(totals.total))}
        </span>
      </span>
      <span className="flex shrink-0 -space-x-4 pr-1">
        {latest.map((c) =>
          c ? (
            <StickerImage key={c.id} src={c.src} size={48} placements={book.placements[c.id]} tilt={stickerTilt(c.id)} />
          ) : null,
        )}
      </span>
      {unseen > 0 && (
        <span
          data-testid="home-sticker-new"
          className="absolute -right-2 -top-2 rounded-full border-[3px] px-2 text-sm font-black"
          style={{ backgroundColor: CORAL, borderColor: INK, color: '#fff' }}
        >
          +{unseen}
        </span>
      )}
    </button>
  );
}
