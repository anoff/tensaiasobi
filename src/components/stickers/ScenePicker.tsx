import { MAX_PAGES, type PageBackground, type StickerSave } from '../../data/stickerRules';
import { SCENE_THEMES, THUMBNAIL_SEED, newSeed } from '../../data/sceneThemes';
import { useTranslation } from '../../hooks/useTranslation';
import { INK, PAPER, hardShadow } from '../../theme/blockTable';
import { SceneBackground } from './SceneBackground';

interface ScenePickerProps {
  book: StickerSave;
  /** Adds the page (it counts toward MAX_PAGES) and shows it. */
  onPick: (background: PageBackground) => void;
}

/** Thumbnail canvas size in CSS px; the card scales it. */
const THUMB_W = 96;
const THUMB_H = Math.round((THUMB_W * 16) / 9);

/**
 * The Scenes tab is the New page picker: Blank plus the 20 scene themes, each shown at seed 1. It is plain
 * content in the page flow, so the whole screen scrolls (no inner scroll bar).
 */
export function ScenePicker({ book, onPick }: ScenePickerProps) {
  const { t } = useTranslation();
  const full = book.pages.length >= MAX_PAGES;
  const card = 'relative w-full overflow-hidden rounded-xl border-[3px] disabled:opacity-50';
  const cardStyle = { aspectRatio: '9 / 16', backgroundColor: PAPER, borderColor: INK, boxShadow: hardShadow(2, 3) };
  const label = 'mt-1 block text-center text-xs font-black leading-tight';
  return (
    <div className="mt-2 w-full pb-4 md:mx-auto md:max-w-xl" data-testid="book-scenes">
      <h2 className="mb-2 text-lg font-black" style={{ color: INK }}>
        {t.stickerBook.newPage}
      </h2>
      {full && (
        <p className="mb-2 text-sm font-extrabold" style={{ color: INK }} data-testid="scene-picker-full">
          {t.stickerBook.pagesFull}
        </p>
      )}
      <div className="grid grid-cols-3 gap-x-3 gap-y-3 md:grid-cols-5" data-testid="scene-picker">
        <div>
          <button
            type="button"
            data-testid="page-bg-blank"
            disabled={full}
            className={card}
            style={cardStyle}
            onClick={() => onPick('blank')}
            aria-label={t.stickerBook.blank}
          />
          <span className={label} style={{ color: INK }}>
            {t.stickerBook.blank}
          </span>
        </div>
        {SCENE_THEMES.map((theme) => (
          <div key={theme.id}>
            <button
              type="button"
              data-testid={`page-bg-${theme.id}`}
              disabled={full}
              className={card}
              style={cardStyle}
              aria-label={t.stickerBook.themes[theme.id]}
              // Each new page gets its own seed (semi-random); the thumbnail shows seed 1.
              onClick={() => onPick({ theme: theme.id, seed: newSeed() })}
            >
              <SceneBackground background={{ theme: theme.id, seed: THUMBNAIL_SEED }} width={THUMB_W} height={THUMB_H} thumbnail />
              <span className="absolute left-1 top-0.5 text-base" aria-hidden>
                {theme.emoji}
              </span>
            </button>
            <span className={label} style={{ color: INK }}>
              {t.stickerBook.themes[theme.id]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
