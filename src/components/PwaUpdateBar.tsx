import { BUTTER, INK, hardShadow } from '../theme/blockTable';
import { useTranslation } from '../hooks/useTranslation';

interface PwaUpdateBarProps {
  visible: boolean;
  onUpdate: () => void;
}

/** Fixed home-screen bar: a waiting PWA update, tapped to apply and reload. */
export function PwaUpdateBar({ visible, onUpdate }: PwaUpdateBarProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <button
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
