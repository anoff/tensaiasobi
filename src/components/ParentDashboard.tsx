import KidButton from './KidButton';
import { useTranslation } from '../hooks/useTranslation';
import type { Voucher } from '../types/gamification';

interface ParentDashboardProps {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
  vouchers: Voucher[];
  onToggleVoucher: (id: string) => void;
  onSetVoucherCost: (id: string, cost: number) => void;
  onClearProgress: () => void;
  onClose: () => void;
}

export function ParentDashboard({
  soundEnabled,
  setSoundEnabled,
  vibrationEnabled,
  setVibrationEnabled,
  vouchers,
  onToggleVoucher,
  onSetVoucherCost,
  onClearProgress,
  onClose,
}: ParentDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full select-none animate-in fade-in slide-in-from-bottom-6 duration-200">
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 p-8 w-full shadow-lg space-y-8 max-h-[85vh] overflow-y-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-800">{t.parentDashboard.title}</h2>
          <p className="text-slate-500 text-sm mt-1">{t.parentDashboard.subtitle}</p>
        </div>

        <div className="space-y-6">
          {/* Sound settings */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.sound}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.soundDesc}</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`
                w-16 h-10 rounded-full border-2 border-slate-300 p-1 transition-colors relative cursor-pointer outline-none
                ${soundEnabled ? 'bg-emerald-400 border-emerald-500' : 'bg-slate-200'}
              `}
            >
              <div
                className={`
                  w-7 h-7 rounded-full bg-white shadow-md transition-transform duration-200
                  ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Vibration settings */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.vibration}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.vibrationDesc}</span>
            </div>
            <button
              onClick={() => setVibrationEnabled(!vibrationEnabled)}
              className={`
                w-16 h-10 rounded-full border-2 border-slate-300 p-1 transition-colors relative cursor-pointer outline-none
                ${vibrationEnabled ? 'bg-emerald-400 border-emerald-500' : 'bg-slate-200'}
              `}
            >
              <div
                className={`
                  w-7 h-7 rounded-full bg-white shadow-md transition-transform duration-200
                  ${vibrationEnabled ? 'translate-x-6' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          {/* Vouchers section */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.vouchersTitle}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.vouchersDesc}</span>
            </div>
            
            <div className="space-y-3">
              {vouchers.map((voucher) => (
                <div key={voucher.id} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{voucher.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-800 block truncate">
                          {(t.shop.voucherNames as Record<string, string>)[voucher.nameKey] ?? voucher.nameKey}
                        </span>
                        {voucher.redeemedAt && (
                          <span className="text-[10px] text-green-600 block">
                            ✅ {new Date(voucher.redeemedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => onToggleVoucher(voucher.id)}
                      className={`
                        px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer outline-none border shrink-0
                        ${voucher.enabled
                          ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}
                      `}
                    >
                      {voucher.enabled ? t.parentDashboard.voucherEnabled : 'Disabled'}
                    </button>
                  </div>
                  
                  {voucher.enabled && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <span className="text-slate-500">{t.parentDashboard.voucherCost}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600">⭐</span>
                        <input
                          type="number"
                          value={voucher.cost}
                          onChange={(e) => onSetVoucherCost(voucher.id, parseInt(e.target.value, 10) || 0)}
                          className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-right font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                          min="1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-100 space-y-3">
            <div>
              <span className="text-lg font-bold text-red-800 block">{t.parentDashboard.dangerZone}</span>
              <span className="text-xs text-red-500">{t.parentDashboard.dangerZoneDesc}</span>
            </div>
            <button
              onClick={() => {
                if (confirm(t.parentDashboard.resetConfirm)) {
                  onClearProgress();
                }
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm outline-none"
            >
              {t.parentDashboard.resetBtn}
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-center">
          <KidButton color="pink" size="md" onClick={onClose} className="w-full">
            {t.parentDashboard.close}
          </KidButton>
        </div>
      </div>
    </div>
  );
}

export default ParentDashboard;
