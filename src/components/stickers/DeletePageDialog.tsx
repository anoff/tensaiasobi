import { useEffect, useRef, useState } from 'react';
import type { BookPage, StickerSave } from '../../data/stickerRules';
import { PAGE_SIZE_STEPS } from '../../data/stickerRules';
import { collectibleById, stickerLook, stickerTilt } from '../../data/stickers';
import { useTranslation } from '../../hooks/useTranslation';
import { CHALK, CORAL, INK, hardShadow } from '../../theme/blockTable';
import KidButton from '../KidButton';
import { SceneBackground } from './SceneBackground';
import { StickerImage } from './StickerImage';
import { useBookBack } from './useBookBack';

export function DeletePageDialog({ book, page, onCancel, onConfirm }: {
  book: StickerSave;
  page: BookPage;
  onCancel: () => void;
  onConfirm: () => boolean;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  const [failed, setFailed] = useState(false);
  useBookBack(onCancel);
  useEffect(() => {
    const opener = document.activeElement;
    const element = dialog.current;
    element?.showModal();
    keep.current?.focus();
    return () => {
      element?.close();
      queueMicrotask(() => {
        if (element?.open) return;
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        else document.querySelector<HTMLButtonElement>('[data-testid="page-delete"], [data-testid="page-new"]')?.focus();
      });
    };
  }, []);
  return <dialog ref={dialog} data-testid="page-delete-dialog" aria-labelledby="delete-page-title"
    aria-describedby="delete-page-body" className="w-[calc(100%_-_32px)] max-w-xs rounded-[2rem] border-[3px] p-4 backdrop:bg-black/50"
    style={{ backgroundColor: CHALK, color: INK, borderColor: INK, boxShadow: hardShadow(4, 5) }}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return;
      const last = dialog.current?.querySelector<HTMLButtonElement>('[data-testid="page-delete-confirm"]');
      if (event.shiftKey && document.activeElement === keep.current) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        keep.current?.focus();
      }
    }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCancel();
    }}>
    <h2 id="delete-page-title" className="text-lg font-black">{t.stickerBook.deleteTitle}</h2>
    <p id="delete-page-body" className="my-3 text-sm font-extrabold">{t.stickerBook.deleteBody}</p>
    <div aria-hidden="true" data-testid="page-delete-preview" className="relative mx-auto mb-4 overflow-hidden rounded-xl border-[3px] bg-white"
      style={{ width: 90, height: 160, borderColor: INK }}>
      {page.background !== 'blank' && <SceneBackground background={page.background} width={84} height={154} thumbnail />}
      {page.stickers.map((placed) => {
        const copy = book.copies.find((c) => c.uid === placed.uid);
        const sticker = copy && collectibleById(copy.id);
        if (!copy || !sticker) return null;
        const size = 90 * PAGE_SIZE_STEPS[placed.size];
        return <span key={copy.uid} className="absolute" style={{ left: `${placed.x * 100}%`, top: `${placed.y * 100}%`, width: size, height: size, transform: `translate(-50%, -50%) rotate(${placed.rotation}deg)` }}>
          <StickerImage {...stickerLook(sticker, copy.shiny)} size={size} shiny={copy.shiny} tilt={stickerTilt(copy.id)} placements={book.placements[copy.uid]} />
        </span>;
      })}
    </div>
    {failed && <p role="alert" className="mb-3 text-sm font-extrabold">{t.stickerBook.saveFailed}</p>}
    <div className="flex flex-col gap-3">
      <button ref={keep} type="button" data-testid="page-delete-cancel" onClick={onCancel}
        className="min-h-12 rounded-xl border-[3px] px-4 py-2 text-base font-black focus-visible:ring-4 focus-visible:ring-amber-400/70"
        style={{ borderColor: INK, backgroundColor: '#fff', boxShadow: hardShadow(3, 4) }}>{t.stickerBook.keepPage}</button>
      <KidButton type="button" size="sm" color="red" className="min-h-12 !text-base" data-testid="page-delete-confirm"
        style={{ backgroundColor: CORAL, color: INK }} onClick={() => {
          if (confirmed.current) return;
          confirmed.current = true;
          if (!onConfirm()) { confirmed.current = false; setFailed(true); }
        }}>🗑 {t.stickerBook.deletePage}</KidButton>
    </div>
  </dialog>;
}
