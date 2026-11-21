import { useLayoutEffect, useRef } from 'react';
import { BUTTER, INK, hardShadow } from '../theme/blockTable';
import { useTranslation } from '../hooks/useTranslation';
import { UPDATE_BAR_OFFSET_PX, updateBarScrollPadding } from './updateBarPadding';

interface PwaUpdateBarProps {
  visible: boolean;
  onUpdate: () => void;
  /** Called with the scroll-container padding to reserve, or null when the bar is hidden. */
  onReserveChange?: (padding: string | null) => void;
}

/** Fixed home-screen bar: a waiting PWA update, tapped to apply and reload. */
export function PwaUpdateBar({ visible, onUpdate, onReserveChange }: PwaUpdateBarProps) {
  const { t } = useTranslation();
  const barRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!visible || !barRef.current) {
      onReserveChange?.(null);
      return;
    }
    const el = barRef.current;
    const report = () => onReserveChange?.(updateBarScrollPadding(el.offsetHeight));
    report();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => report());
    ro.observe(el);
    return () => {
      ro.disconnect();
      onReserveChange?.(null);
    };
  }, [visible, onReserveChange]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: `calc(${UPDATE_BAR_OFFSET_PX}px + env(safe-area-inset-bottom, 0px))` }}
    >
      <button
        ref={barRef}
        type="button"
        data-testid="pwa-update-bar"
        onClick={onUpdate}
        className="pointer-events-auto animate-card-in motion-reduce:animate-none inline-flex items-center justify-center gap-2 rounded-xl border-[3px] px-4 py-2 font-black text-[14px] leading-none select-none touch-manipulation cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70 transition-all duration-75 active:translate-x-[3px] active:translate-y-[4px] active:[box-shadow:none]"
        style={{
          backgroundColor: BUTTER,
          borderColor: INK,
          color: INK,
          boxShadow: hardShadow(3, 4),
        }}
      >
        <span aria-hidden="true">🔄</span>
        {t.menu.updateAvailable}
      </button>
    </div>
  );
}
