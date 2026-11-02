import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collectibleById } from '../../data/stickers';
import { I18nProvider } from '../../hooks/useTranslation';
import { StickerAward } from './StickerAward';
import { HINT_MS, REVEAL_MS, SELF_OPEN_MS, TWIST_MS } from './awardTimeline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mount() {
  const onDone = vi.fn();
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() =>
    root.render(
      <I18nProvider>
        <StickerAward sticker={collectibleById('numbers_01')!} shiny={false} count={1} onDone={onDone} />
      </I18nProvider>,
    ),
  );
  const award = () => el.querySelector<HTMLElement>('[data-testid="sticker-award"]')!;
  return {
    onDone,
    phase: () => award().dataset.phase,
    tap: () => act(() => award().click()),
    wait: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
    unmount: () => {
      act(() => root.unmount());
      el.remove();
    },
  };
}

describe('StickerAward taps (never swallowed) and timing', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits for a tap: wiggles at 1.5 s, still closed at 1.7 s, opens itself only at 4 s', () => {
    const a = mount();
    expect(a.phase()).toBe('twist');
    a.wait(TWIST_MS);
    expect(a.phase()).toBe('ready');
    a.wait(HINT_MS - TWIST_MS);
    expect(a.phase()).toBe('hint');
    a.wait(200); // 1.7 s
    expect(a.phase()).toBe('hint');
    a.wait(SELF_OPEN_MS - HINT_MS - 201);
    expect(a.phase()).toBe('hint');
    a.wait(1);
    expect(a.phase()).toBe('reveal');
    expect(a.onDone).not.toHaveBeenCalled();
    a.wait(REVEAL_MS);
    expect(a.onDone).toHaveBeenCalledTimes(1);
    a.unmount();
  });

  it.each([
    ['during the twist', 100],
    ['while it waits', TWIST_MS + 100],
    ['while it wiggles', HINT_MS + 100],
  ])('a tap %s opens the capsule at once', (_, at) => {
    const a = mount();
    a.wait(at);
    a.tap();
    expect(a.phase()).toBe('reveal');
    expect(a.onDone).not.toHaveBeenCalled();
    a.unmount();
  });

  it('a tap after the reveal closes the overlay straight away', () => {
    const a = mount();
    a.tap();
    expect(a.phase()).toBe('reveal');
    a.wait(300);
    a.tap();
    expect(a.onDone).toHaveBeenCalledTimes(1);
    a.unmount();
  });
});
