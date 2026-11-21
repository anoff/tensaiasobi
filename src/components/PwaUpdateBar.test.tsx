import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../hooks/useTranslation';
import { usePwaUpdate } from '../hooks/usePwaUpdate';
import type { PwaUpdateWatch } from '../platform/pwa';
import { PwaUpdateBar } from './PwaUpdateBar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ isHome, watch }: { isHome: boolean; watch: PwaUpdateWatch }) {
  const { updateAvailable, applyUpdate } = usePwaUpdate(watch);
  return <PwaUpdateBar visible={isHome && updateAvailable} onUpdate={applyUpdate} />;
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
    rerender: render,
    unmount: () => {
      act(() => root.unmount());
      el.remove();
    },
  };
}

describe('PwaUpdateBar', () => {
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
});
