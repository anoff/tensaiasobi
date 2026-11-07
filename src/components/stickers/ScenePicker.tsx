import { useEffect, useRef, useState } from 'react';
import { canAddPage, type PageBackground, type StickerSave } from '../../data/stickerRules';
import { SCENE_THEMES, THUMBNAIL_SEED, newSeed } from '../../data/sceneThemes';
import { useTranslation } from '../../hooks/useTranslation';
import { INK, PAPER, hardShadow } from '../../theme/blockTable';
import { BLANK_PAGE_FILL } from '../../data/sceneArt';
import { SceneBackground } from './SceneBackground';
import { useBookBack } from './useBookBack';

interface ScenePickerProps {
  book: StickerSave;
  /** Adds the page (it counts toward MAX_PAGES) and shows it. */
  onPick: (background: PageBackground) => boolean;
  onCancel: () => void;
}

/** Thumbnail canvas size in CSS px; the card scales it. */
const THUMB_W = 96;
const THUMB_H = Math.round((THUMB_W * 16) / 9);

/** Nested Add page view: Blank plus every scene theme, with a seed-1 preview. */
export function ScenePicker({ book, onPick, onCancel }: ScenePickerProps) {
  const { t } = useTranslation();
  const picked = useRef(false);
  const [failed, setFailed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useBookBack(onCancel);
  useEffect(() => () => {
    queueMicrotask(() => {
      if (!document.querySelector('[data-testid="book-scenes"]')) document.querySelector<HTMLButtonElement>('[data-testid="page-new"]')?.focus();
    });
  }, []);
  useEffect(() => {
    cancelRef.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
    };
  }, [onCancel]);
  const pick = (background: PageBackground) => {
    if (picked.current) return;
    picked.current = true;
    if (!onPick(background)) {
      picked.current = false;
      setFailed(true);
    }
  };
  // 20 pages or more (old books can convert past 20): no New page cards until the book is under 20 again.
  const full = !canAddPage(book);
  const card = 'relative w-full overflow-hidden rounded-xl border-[3px]';
  const cardStyle = { aspectRatio: '9 / 16', backgroundColor: PAPER, borderColor: INK, boxShadow: hardShadow(2, 3) };
  const label = 'mt-1 block text-center text-xs font-black leading-tight';
  return (
    <div className="mt-2 w-full pb-4 md:mx-auto md:max-w-xl" data-testid="book-scenes">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black" style={{ color: INK }}>+ {t.stickerBook.newPage}</h2>
        <button ref={cancelRef} type="button" data-testid="page-add-cancel" onClick={onCancel}
          className="min-h-11 rounded-xl border-[3px] px-3 font-black" style={{ borderColor: INK, color: INK }}>
          {t.parentGate.cancel}
        </button>
      </div>
      {failed && <p role="alert" className="mb-2 font-extrabold">{t.stickerBook.saveFailed}</p>}
      {full && (
        <p className="mb-2 text-sm font-extrabold" style={{ color: INK }} data-testid="scene-picker-full">
          {t.stickerBook.pagesFull}
        </p>
      )}
      {!full && (
        <div className="grid grid-cols-3 gap-x-3 gap-y-3 md:grid-cols-5" data-testid="scene-picker">
          <div>
            <button
              type="button"
              data-testid="page-bg-blank"
              className={card}
              style={{ ...cardStyle, backgroundColor: BLANK_PAGE_FILL }}
              onClick={() => pick('blank')}
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
                className={card}
                style={cardStyle}
                aria-label={t.stickerBook.themes[theme.id]}
                // Each new page gets its own seed (semi-random); the thumbnail shows seed 1.
                onClick={() => pick({ theme: theme.id, seed: newSeed() })}
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
      )}
    </div>
  );
}
