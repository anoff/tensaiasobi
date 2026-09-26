import { useState } from 'react';
import KidButton from './KidButton';
import { useTranslation } from '../hooks/useTranslation';
import { couponLabel, type Coupon, type CouponRewardSize } from '../types/gamification';

interface ParentDashboardProps {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
  coupons: Coupon[];
  onToggleCoupon: (id: string) => void;
  onClearProgress: () => void;
  onClose: () => void;
  onAddCoupon: (input: { emoji: string; name: string; rewardSize: CouponRewardSize }) => void;
  onRemoveCoupon: (id: string) => void;
}

export function ParentDashboard({
  soundEnabled,
  setSoundEnabled,
  vibrationEnabled,
  setVibrationEnabled,
  coupons,
  onToggleCoupon,
  onClearProgress,
  onClose,
  onAddCoupon,
  onRemoveCoupon,
}: ParentDashboardProps) {
  const { t } = useTranslation();
  const [newEmoji, setNewEmoji] = useState('🎟️');
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState<CouponRewardSize>('small');

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

          {/* Coupons section */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.couponsTitle}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.couponsDesc}</span>
            </div>

            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{coupon.emoji}</span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-800 block truncate">
                          {couponLabel(coupon, t.coupons.couponNames)}
                        </span>
                        {coupon.earnedCount > 0 && coupon.lastEarnedAt && (
                          <span className="text-[10px] text-green-600 block">
                            ✅ {new Date(coupon.lastEarnedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onToggleCoupon(coupon.id)}
                        className={`
                          px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer outline-none border
                          ${coupon.enabled
                            ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}
                        `}
                      >
                        {coupon.enabled ? t.parentDashboard.couponEnabled : t.coupons.disabled}
                      </button>
                      {coupon.isCustom && (
                        <button
                          type="button"
                          data-testid={`remove-coupon-${coupon.id}`}
                          onClick={() => onRemoveCoupon(coupon.id)}
                          className="px-2 py-1 rounded-full text-xs font-bold text-red-600 border border-red-200 hover:bg-red-50"
                        >
                          {t.parentDashboard.removeCoupon}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form
              className="space-y-2 pt-2 border-t border-slate-200"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                onAddCoupon({ emoji: newEmoji, name: newName, rewardSize: newSize });
                setNewName('');
                setNewEmoji('🎟️');
                setNewSize('small');
              }}
            >
              <span className="text-sm font-bold text-slate-700 block">{t.parentDashboard.addCoupon}</span>
              <div className="flex gap-2">
                <input
                  data-testid="custom-coupon-emoji"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="w-14 text-center text-xl border-2 border-slate-200 rounded-xl"
                  aria-label={t.parentDashboard.couponEmoji}
                />
                <input
                  data-testid="custom-coupon-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.parentDashboard.couponNamePlaceholder}
                  className="flex-1 text-sm border-2 border-slate-200 rounded-xl px-3"
                />
              </div>
              <div className="flex gap-2">
                <select
                  data-testid="custom-coupon-size"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value as CouponRewardSize)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-bold"
                >
                  <option value="small">{t.parentDashboard.rewardSmall}</option>
                  <option value="medium">{t.parentDashboard.rewardMedium}</option>
                  <option value="large">{t.parentDashboard.rewardLarge}</option>
                </select>
                <button
                  type="submit"
                  data-testid="custom-coupon-add"
                  className="px-3 py-1.5 rounded-xl text-sm font-bold bg-purple-600 text-white"
                >
                  {t.parentDashboard.addCouponBtn}
                </button>
              </div>
            </form>
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
