import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STICKER_STORAGE_KEY, addCopy, emptyStickerSave, freeCopies, grantOnce, parseStickerSave } from '../data/stickerRules';
import { useStickers, type UseStickersReturn } from './useStickers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount() {
  const ref: { current: UseStickersReturn | null } = { current: null };
  function Probe() {
    ref.current = useStickers();
    return null;
  }
  const el = document.createElement('div');
  const root = createRoot(el);
  act(() => root.render(<Probe />));
  return { hook: () => ref.current!, unmount: () => act(() => root.unmount()) };
}

describe('useStickers my pages autosave', () => {
  beforeEach(() => {
    localStorage.clear();
    const owned = addCopy(grantOnce(emptyStickerSave(), 'numbers_01'), 'numbers_01', false).save;
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(owned));
  });
  afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

  it('saves every page edit to v2 storage straight away and reloads it', () => {
    const a = mount();
    act(() => a.hook().pages.addPage({ theme: 'park', seed: 7 }));
    act(() => a.hook().pages.place('p1', 'numbers_01', 0.25, 0.75));
    act(() => a.hook().pages.update('p1', 'c1', { size: 2, rotation: 15 }));

    const stored = parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY));
    expect(JSON.parse(localStorage.getItem(STICKER_STORAGE_KEY)!).version).toBe(2);
    expect(stored.pages).toEqual([
      { id: 'p1', background: { theme: 'park', seed: 7 }, stickers: [{ uid: 'c1', x: 0.25, y: 0.75, size: 2, rotation: 15 }] },
    ]);
    a.unmount();

    const b = mount();
    expect(b.hook().book.pages).toEqual(stored.pages);
    act(() => b.hook().pages.remove('p1', 'c1'));
    expect(parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY)).pages[0].stickers).toEqual([]);
    b.unmount();
  });
  it('saves rerolls only while the page is empty and allows them again after peeling the last copy', () => {
    const a = mount();
    act(() => a.hook().pages.addPage({ theme: 'park', seed: 7 }));
    act(() => a.hook().pages.reroll('p1'));
    expect(a.hook().book.pages[0].background).not.toEqual({ theme: 'park', seed: 7 });
    act(() => a.hook().pages.place('p1', 'numbers_01', 0.25, 0.75));
    const populated = a.hook().book;
    const stored = localStorage.getItem(STICKER_STORAGE_KEY);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => a.hook().pages.reroll('p1'));
    expect(a.hook().book).toBe(populated);
    expect(localStorage.getItem(STICKER_STORAGE_KEY)).toBe(stored);
    expect(writes).not.toHaveBeenCalled();
    act(() => a.hook().pages.remove('p1', 'c1'));
    const emptyBackground = a.hook().book.pages[0].background;
    act(() => a.hook().pages.reroll('p1'));
    expect(a.hook().book.pages[0].background).not.toEqual(emptyBackground);
    expect(a.hook().book.copies).toEqual(populated.copies);
    expect(parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY))).toEqual(a.hook().book);
    a.unmount();
  });

  it('deletes one page in one write, returning exact plain/shiny copies with accessories and reloading', () => {
    const base = emptyStickerSave();
    const original = {
      ...base,
      copies: [
        { uid: 'a', id: 'numbers_01', shiny: false },
        { uid: 'b', id: 'numbers_01', shiny: true },
        { uid: 'c', id: 'numbers_01', shiny: false },
      ],
      ownedAccessories: ['crown'],
      placements: { b: [{ accessoryId: 'crown', x: 0.5, y: 0.2 }] },
      pages: [
        { id: 'p1', background: 'blank', stickers: [
          { uid: 'a', x: 0.2, y: 0.3, size: 1, rotation: 0 },
          { uid: 'b', x: 0.6, y: 0.7, size: 2, rotation: 10 },
        ] },
        { id: 'p2', background: 'blank', stickers: [{ uid: 'c', x: 0.5, y: 0.5, size: 0, rotation: 0 }] },
      ],
    };
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(original));
    const a = mount();
    expect(freeCopies(a.hook().book, 'numbers_01')).toHaveLength(0);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => { expect(a.hook().pages.deletePage('p1')).toBe(true); });
    expect(writes).toHaveBeenCalledTimes(1);
    expect(freeCopies(a.hook().book, 'numbers_01')).toEqual(original.copies.slice(0, 2));
    expect(a.hook().book.copies).toEqual(original.copies);
    expect(a.hook().book.placements).toEqual(original.placements);
    expect(a.hook().book.ownedAccessories).toEqual(original.ownedAccessories);
    expect(a.hook().book.pages).toEqual(original.pages.slice(1));
    a.unmount();
    const b = mount();
    expect(b.hook().book.pages).toEqual(original.pages.slice(1));
    expect(freeCopies(b.hook().book, 'numbers_01')).toEqual(original.copies.slice(0, 2));
    act(() => { expect(b.hook().pages.deletePage('p2')).toBe(true); });
    expect(b.hook().book.pages).toEqual([]);
    b.unmount();
    const c = mount();
    expect(c.hook().book.pages).toEqual([]);
    expect(c.hook().book.copies).toEqual(original.copies);
    c.unmount();
  });

  it('a failed deletion keeps the page and saved book intact, then retries without minting copies', () => {
    const a = mount();
    act(() => { a.hook().pages.addPage('blank'); a.hook().pages.place('p1', 'numbers_01', 0.4, 0.6); });
    const before = a.hook().book;
    const stored = localStorage.getItem(STICKER_STORAGE_KEY);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    act(() => { expect(a.hook().pages.deletePage('p1')).toBe(false); });
    expect(a.hook().book).toBe(before);
    expect(localStorage.getItem(STICKER_STORAGE_KEY)).toBe(stored);
    act(() => { expect(a.hook().pages.deletePage('p1')).toBe(true); });
    expect(write).toHaveBeenCalledTimes(2);
    expect(a.hook().book.pages).toEqual([]);
    expect(a.hook().book.copies).toEqual(before.copies);
    act(() => { expect(a.hook().pages.deletePage('p1')).toBe(false); });
    expect(write).toHaveBeenCalledTimes(2);
    a.unmount();
  });

});
