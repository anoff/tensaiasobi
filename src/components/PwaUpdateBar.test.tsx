import { useCallback, useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../hooks/useTranslation';
import { usePwaUpdate } from '../hooks/usePwaUpdate';
import type { PwaUpdateWatch } from '../platform/pwa';
import { PwaUpdateBar } from './PwaUpdateBar';
import { updateBarScrollPadding } from './updateBarPadding';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BAR_HEIGHT = 44;
const OFFSET_HEIGHT = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

function stubBarHeight() {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.testid === 'pwa-update-bar' ? BAR_HEIGHT : (OFFSET_HEIGHT?.get?.call(this) ?? 0);
    },
  });
}

function Harness({ isHome, watch }: { isHome: boolean; watch: PwaUpdateWatch }) {
  const { updateAvailable, applyUpdate } = usePwaUpdate(watch);
  const [barReserve, setBarReserve] = useState<string | null>(null);
  const onReserveChange = useCallback((padding: string | null) => setBarReserve(padding), []);
  return (
    <>
      <div
        data-testid="home-scroll"
        style={barReserve ? { paddingBottom: barReserve } : undefined}
      >
        <div data-testid="home-launcher" className={barReserve ? '' : 'pb-4'} />
      </div>
      <PwaUpdateBar
        visible={isHome && updateAvailable}
        onUpdate={applyUpdate}
        onReserveChange={onReserveChange}
      />
    </>
  );
}

function mount(isHome: boolean, watch: PwaUpdateWatch) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  const render = (home: boolean) => {
    act(() =>
      root.render(
        <I18nProvider>
          <Harness isHome={home} watch={watch} />
        </I18nProvider>,
      ),
    );
  };
  render(isHome);
  return {
    bar: () => el.querySelector<HTMLButtonElement>('[data-testid="pwa-update-bar"]'),
    scroll: () => el.querySelector<HTMLElement>('[data-testid="home-scroll"]')!,
    launcher: () => el.querySelector<HTMLElement>('[data-testid="home-launcher"]')!,
    rerender: render,
    unmount: () => {
      act(() => root.unmount());
      el.remove();
    },
  };
}

describe('updateBarScrollPadding', () => {
  it('is the bar height plus the 12 px offset, 4 px shadow, 12 px gap and the safe-area inset', () => {
    expect(updateBarScrollPadding(44)).toBe(
      'calc(72px + env(safe-area-inset-bottom, 0px))',
    );
  });
});

describe('PwaUpdateBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (OFFSET_HEIGHT) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', OFFSET_HEIGHT);
  });

  it('shows only on home when an update is waiting, is held during a game, and a tap applies the update', () => {
    const apply = vi.fn();
    const watch: PwaUpdateWatch = (onWaiting) => {
      onWaiting(apply);
      return () => {};
    };

    const ui = mount(true, watch);
    const bar = ui.bar();
    expect(bar).not.toBeNull();
    expect(bar?.textContent).toContain('New version! Tap to update');
    expect(bar?.textContent).toContain('🔄');

    ui.rerender(false);
    expect(ui.bar()).toBeNull();

    ui.rerender(true);
    expect(ui.bar()).not.toBeNull();

    act(() => ui.bar()?.click());
    expect(apply).toHaveBeenCalledTimes(1);
    ui.unmount();
  });

  it('stays hidden on home when no update is waiting', () => {
    const watch: PwaUpdateWatch = () => () => {};
    const ui = mount(true, watch);
    expect(ui.bar()).toBeNull();
    ui.unmount();
  });

  it('pads the scroll container by the bar height, offset, shadow, gap and safe-area while the bar is showing, and drops that padding when it is hidden', () => {
    stubBarHeight();
    const watch: PwaUpdateWatch = (onWaiting) => {
      onWaiting(() => {});
      return () => {};
    };
    const expected = updateBarScrollPadding(BAR_HEIGHT);

    const ui = mount(true, watch);
    expect(ui.bar()).not.toBeNull();
    expect(ui.scroll().style.paddingBottom).toBe(expected);
    expect(ui.launcher().style.paddingBottom).toBe('');
    expect(ui.launcher().className).not.toContain('pb-4');

    ui.rerender(false);
    expect(ui.bar()).toBeNull();
    expect(ui.scroll().style.paddingBottom).toBe('');
    expect(ui.launcher().className).toContain('pb-4');

    ui.rerender(true);
    expect(ui.scroll().style.paddingBottom).toBe(expected);
    expect(ui.launcher().className).not.toContain('pb-4');
    ui.unmount();
  });
});
