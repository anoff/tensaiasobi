import { useState } from 'react';
import KidButton from './KidButton';
import { GAMES, defaultChallengeAllowedGames } from '../games/catalog';
import { useTranslation } from '../hooks/useTranslation';
import { couponLabel, REWARD_SIZE_STAR_TARGETS, type Coupon, type CouponRewardSize } from '../types/gamification';
import type { AgeBandFilter } from '../games/catalog';
import { SESSION_MINUTE_OPTIONS, type SessionMinutes } from '../hooks/useSessionTimer';

interface ParentDashboardProps {
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (v: boolean) => void;
  coupons: Coupon[];
  onToggleCoupon: (id: string) => void;
  onClearProgress: () => void;
  onClose: () => void;
  challengeActive: boolean;
  challengeStarsTarget: number;
  challengeAllowedGames: Record<string, boolean>;
  challengeCouponId: string;
  onStartChallenge: (targetStars: number, allowedGames: Record<string, boolean>, couponId: string) => void;
  onCancelChallenge: () => void;
  /** Optional coupon id to preselect in the challenge reward picker, e.g. when arriving via the Coupon Shop's "Earn it!" button */
  initialCouponId?: string;
  ageBand: AgeBandFilter;
  setAgeBand: (v: AgeBandFilter) => void;
  sessionMinutes: SessionMinutes;
  setSessionMinutes: (v: SessionMinutes) => void;
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
  challengeActive,
  challengeStarsTarget,
  challengeAllowedGames,
  challengeCouponId,
  onStartChallenge,
  onCancelChallenge,
  initialCouponId,
  ageBand,
  setAgeBand,
  sessionMinutes,
  setSessionMinutes,
  onAddCoupon,
  onRemoveCoupon,
}: ParentDashboardProps) {
  const { t } = useTranslation();
  const [newEmoji, setNewEmoji] = useState('🎟️');
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState<CouponRewardSize>('small');

  const initialCoupon =
    coupons.find((c) => c.id === initialCouponId) ||
    coupons.find((c) => c.id === challengeCouponId) ||
    coupons.find((c) => c.enabled);
  const [selectedTarget, setSelectedTarget] = useState<number>(() => {
    // When arriving via the "Earn it!" shortcut, always size the target to the picked coupon.
    if (initialCouponId && initialCoupon) {
      return REWARD_SIZE_STAR_TARGETS[initialCoupon.rewardSize];
    }
    return challengeStarsTarget || (initialCoupon ? REWARD_SIZE_STAR_TARGETS[initialCoupon.rewardSize] : 10);
  });
  const [selectedCoupon, setSelectedCoupon] = useState<string>(
    initialCouponId || challengeCouponId || initialCoupon?.id || ''
  );

  const handleCouponChange = (id: string) => {
    setSelectedCoupon(id);
    const coupon = coupons.find((c) => c.id === id);
    if (coupon) {
      setSelectedTarget(REWARD_SIZE_STAR_TARGETS[coupon.rewardSize]);
    }
  };
  const [allowedGames, setAllowedGames] = useState<Record<string, boolean>>(() => ({
    ...defaultChallengeAllowedGames(),
    ...challengeAllowedGames,
  }));

  const gamesList = GAMES.map((game) => ({
    id: game.id,
    label: t.menu[game.labelKey],
    icon: game.emoji,
  }));

  const toggleGame = (gameId: string) => {
    setAllowedGames((prev) => ({
      ...prev,
      [gameId]: !prev[gameId],
    }));
  };

  const hasAllowedGames = Object.values(allowedGames).some(Boolean);
  const enabledCoupons = coupons.filter((c) => c.enabled);
  const challengeCoupon = coupons.find((c) => c.id === challengeCouponId);

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

          {/* Age band */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-3">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.ageBand}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.ageBandDesc}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['all', t.parentDashboard.ageAll],
                ['little', t.parentDashboard.ageLittle],
                ['big', t.parentDashboard.ageBig],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`age-band-${id}`}
                  onClick={() => setAgeBand(id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border-2 ${
                    ageBand === id
                      ? 'bg-purple-100 border-purple-400 text-purple-800'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Session timer */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-3">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.sessionTimer}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.sessionTimerDesc}</span>
            </div>
            <select
              data-testid="session-minutes"
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Number(e.target.value) as SessionMinutes)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"
            >
              {SESSION_MINUTE_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num === 0 ? t.parentDashboard.sessionOff : `${num} ${t.parentDashboard.sessionMinutes}`}
                </option>
              ))}
            </select>
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
                          {couponLabel(coupon, t.coupons.couponNames as Record<string, string>)}
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

          {/* Challenge Mode Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-4">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.challenge.title}</span>
              <span className="text-xs text-slate-500">{t.challenge.subtitle}</span>
            </div>

            {challengeActive ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <span className="text-sm font-extrabold text-purple-955 block">Challenge Mode is Active</span>
                    <span className="text-[11px] text-purple-600 block">
                      Target: {challengeStarsTarget} Stars
                    </span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-500">
                  Allowed Games: {gamesList.filter(g => allowedGames[g.id]).map(g => g.label).join(', ')}
                </div>

                {challengeCoupon && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span>{t.challenge.couponReward}:</span>
                    <span className="text-purple-700">
                      {challengeCoupon.emoji} {couponLabel(challengeCoupon, t.coupons.couponNames as Record<string, string>)}
                    </span>
                  </div>
                )}

                <button
                  onClick={onCancelChallenge}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-colors cursor-pointer text-sm outline-none"
                >
                  {t.challenge.cancelChallenge}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">{t.challenge.targetStars}:</span>
                  <select
                    data-testid="challenge-target-stars"
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(parseInt(e.target.value, 10))}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    {[5, 10, 15, 20, 25, 30, 50, 100].map((num) => (
                      <option key={num} value={num}>{num} {t.starCounter.stars}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">{t.challenge.couponReward}:</span>
                  <select
                    data-testid="challenge-coupon-select"
                    value={selectedCoupon}
                    onChange={(e) => handleCouponChange(e.target.value)}
                    disabled={enabledCoupons.length === 0}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
                  >
                    {enabledCoupons.length === 0 && <option value="">{t.challenge.noCouponsAvailable}</option>}
                    {enabledCoupons.map((coupon) => (
                      <option key={coupon.id} value={coupon.id}>
                        {coupon.emoji} {couponLabel(coupon, t.coupons.couponNames as Record<string, string>)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-bold text-slate-700 block">{t.challenge.allowedGames}:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {gamesList.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        data-testid={`challenge-game-${game.id}`}
                        onClick={() => toggleGame(game.id)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer font-bold outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${allowedGames[game.id]
                          ? 'bg-purple-100 border-purple-300 text-purple-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        <span>{game.icon}</span>
                        <span className="truncate">{game.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!hasAllowedGames}
                  onClick={() => {
                    onStartChallenge(selectedTarget, allowedGames, selectedCoupon);
                    onClose();
                  }}
                  className={`w-full font-bold py-3 rounded-xl transition-all cursor-pointer text-sm outline-none shadow-sm ${hasAllowedGames
                    ? 'bg-purple-600 hover:bg-purple-700 text-white border-b-4 border-purple-800 active:border-b-0 active:translate-y-[4px]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  {t.challenge.enableChallenge}
                </button>
              </div>
            )}
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
