import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STICKER_STORAGE_KEY, addCopy, emptyStickerSave, grantOnce, parseStickerSave } from '../data/stickerRules';
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
  afterEach(() => localStorage.clear());

  it('saves every page edit to v2 storage straight away and reloads it', () => {
    const a = mount();
    act(() => a.hook().pages.addPage('numbers'));
    act(() => a.hook().pages.place('p1', 'numbers_01', 0.25, 0.75));
    act(() => a.hook().pages.update('p1', 'c1', { size: 2, rotation: 15 }));

    const stored = parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY));
    expect(JSON.parse(localStorage.getItem(STICKER_STORAGE_KEY)!).version).toBe(2);
    expect(stored.pages).toEqual([
      { id: 'p1', background: 'numbers', stickers: [{ uid: 'c1', x: 0.25, y: 0.75, size: 2, rotation: 15 }] },
    ]);
    a.unmount();

    const b = mount();
    expect(b.hook().book.pages).toEqual(stored.pages);
    act(() => b.hook().pages.remove('p1', 'c1'));
    expect(parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY)).pages[0].stickers).toEqual([]);
    b.unmount();
  });
});
