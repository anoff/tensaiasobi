import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import {
  canUseParentPasskey,
  forgetParentPasskey,
  hasParentPasskey,
  registerParentPasskey,
} from '../utils/webParentAuth';

/**
 * Settings row for the web/PWA parent lock: a passkey that opens the parent gate
 * with Face ID, a fingerprint or the device passcode. Hidden where the browser
 * can't do that (and in the native app, which uses the device lock directly).
 */
export function ParentLockSetting() {
  const { t } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(hasParentPasskey);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void canUseParentPasskey().then((ok) => {
      if (!cancelled) setSupported(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Stay visible while enabled so it can always be turned off.
  if (!supported && !enabled) return null;

  // Runs from the button's click: Safari only shows the passkey prompt for a tap.
  const setUp = () => {
    setBusy(true);
    setFailed(false);
    void registerParentPasskey().then((ok) => {
      setBusy(false);
      setEnabled(ok);
      setFailed(!ok);
    });
  };

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-2" data-testid="parent-lock-setting">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.parentLock}</span>
          <span className="text-xs text-slate-500">{t.parentDashboard.parentLockDesc}</span>
        </div>
        {enabled ? (
          <span className="shrink-0 text-sm font-bold text-emerald-600" data-testid="parent-lock-on">
            {t.parentDashboard.parentLockOn}
          </span>
        ) : (
          <button
            type="button"
            data-testid="parent-lock-set-up"
            onClick={setUp}
            disabled={busy}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
          >
            {t.parentDashboard.parentLockSetUp}
          </button>
        )}
      </div>
      {enabled && (
        <button
          type="button"
          data-testid="parent-lock-off"
          onClick={() => {
            forgetParentPasskey();
            setEnabled(false);
          }}
          className="text-xs font-bold text-slate-500 underline cursor-pointer"
        >
          {t.parentDashboard.parentLockOff}
        </button>
      )}
      {failed && (
        <p className="text-xs font-bold text-red-600" role="alert">
          {t.parentDashboard.parentLockFailed}
        </p>
      )}
    </div>
  );
}

export default ParentLockSetting;
