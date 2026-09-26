import { useState } from 'react';
import KidButton from './KidButton';
import { GAMES, defaultChallengeAllowedGames, type AgeBandFilter } from '../games/catalog';
import { useTranslation } from '../hooks/useTranslation';
import { couponLabel, REWARD_SIZE_STAR_TARGETS, type Coupon } from '../types/gamification';
import { SESSION_MINUTE_OPTIONS, type SessionMinutes } from '../hooks/useSessionTimer';

export interface SessionStartConfig {
  ageBand: AgeBandFilter;
  minutes: SessionMinutes;
  mode: 'free' | 'learn';
  targetStars: number;
  allowedGames: Record<string, boolean>;
  couponId: string;
}

interface SessionCardProps {
  ageBand: AgeBandFilter;
  sessionMinutes: SessionMinutes;
  coupons: Coupon[];
  challengeActive: boolean;
  challengePlayUnlocked: boolean;
  challengeStarsTarget: number;
  challengeAllowedGames: Record<string, boolean>;
  challengeCouponId: string;
  initialCouponId?: string;
  onStart: (config: SessionStartConfig) => void;
  onEndSession: () => void;
  onClose: () => void;
}

export function SessionCard({
  ageBand,
  sessionMinutes,
  coupons,
  challengeActive,
  challengePlayUnlocked,
  challengeStarsTarget,
  challengeAllowedGames,
  challengeCouponId,
  initialCouponId,
  onStart,
  onEndSession,
  onClose,
}: SessionCardProps) {
  const { t } = useTranslation();
  const learnFirstDefault = Boolean(initialCouponId) || challengeActive;
  const [age, setAge] = useState<AgeBandFilter>(ageBand);
  const [minutes, setMinutes] = useState<SessionMinutes>(sessionMinutes);
  const [mode, setMode] = useState<'free' | 'learn'>(learnFirstDefault ? 'learn' : 'free');

  const enabledCoupons = coupons.filter((c) => c.enabled);
  const initialCoupon =
    coupons.find((c) => c.id === initialCouponId) ||
    coupons.find((c) => c.id === challengeCouponId) ||
    enabledCoupons[0];

  const [selectedTarget, setSelectedTarget] = useState<number>(() => {
    if (initialCouponId && initialCoupon) return REWARD_SIZE_STAR_TARGETS[initialCoupon.rewardSize];
    return challengeStarsTarget || (initialCoupon ? REWARD_SIZE_STAR_TARGETS[initialCoupon.rewardSize] : 10);
  });
  const [selectedCoupon, setSelectedCoupon] = useState<string>(
    initialCouponId || challengeCouponId || initialCoupon?.id || '',
  );
  const [allowedGames, setAllowedGames] = useState<Record<string, boolean>>(() => ({
    ...defaultChallengeAllowedGames(),
    ...challengeAllowedGames,
  }));

  const learnGames = GAMES.filter((game) => game.kind === 'learn');
  const hasAllowedGames = learnGames.some((game) => allowedGames[game.id]);

  const handleCouponChange = (id: string) => {
    setSelectedCoupon(id);
    const coupon = coupons.find((c) => c.id === id);
    if (coupon) setSelectedTarget(REWARD_SIZE_STAR_TARGETS[coupon.rewardSize]);
  };

  const canStart = mode === 'free' || hasAllowedGames;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full select-none animate-in fade-in slide-in-from-bottom-6 duration-200">
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 p-8 w-full shadow-lg space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-800">{t.sessionCard.title}</h2>
          <p className="text-slate-500 text-sm mt-1">{t.sessionCard.subtitle}</p>
        </div>

        {challengeActive && (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2" data-testid="session-running">
            <span className="text-sm font-extrabold text-purple-800 block">
              {challengePlayUnlocked ? t.challenge.playUnlockedBadge : t.sessionCard.active}
            </span>
            <button
              type="button"
              data-testid="session-end"
              onClick={() => {
                onEndSession();
                onClose();
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-sm"
            >
              {t.sessionCard.end}
            </button>
          </div>
        )}

        <div className="space-y-4">
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
                  onClick={() => setAge(id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border-2 ${
                    age === id
                      ? 'bg-purple-100 border-purple-400 text-purple-800'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-3">
            <div>
              <span className="text-lg font-bold text-slate-800 block">{t.parentDashboard.sessionTimer}</span>
              <span className="text-xs text-slate-500">{t.parentDashboard.sessionTimerDesc}</span>
            </div>
            <select
              data-testid="session-minutes"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) as SessionMinutes)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-400"
            >
              {SESSION_MINUTE_OPTIONS.map((num) => (
                <option key={num} value={num}>
                  {num === 0 ? t.parentDashboard.sessionOff : `${num} ${t.parentDashboard.sessionMinutes}`}
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 space-y-3">
            <span className="text-lg font-bold text-slate-800 block">{t.sessionCard.mode}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="session-mode-free"
                onClick={() => setMode('free')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border-2 ${
                  mode === 'free'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {t.sessionCard.modeFree}
              </button>
              <button
                type="button"
                data-testid="session-mode-learn"
                onClick={() => setMode('learn')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border-2 ${
                  mode === 'learn'
                    ? 'bg-purple-100 border-purple-400 text-purple-800'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {t.sessionCard.modeLearn}
              </button>
            </div>

            {mode === 'learn' && (
              <div className="space-y-3 pt-1">
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
                        {coupon.emoji} {couponLabel(coupon, t.coupons.couponNames)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-bold text-slate-700 block">{t.challenge.focusGames}:</span>
                  <span className="text-xs text-slate-500 block">{t.challenge.focusGamesHint}</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {learnGames.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        data-testid={`challenge-game-${game.id}`}
                        onClick={() => setAllowedGames((prev) => ({ ...prev, [game.id]: !prev[game.id] }))}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer font-bold outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${allowedGames[game.id]
                          ? 'bg-purple-100 border-purple-300 text-purple-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span>{game.emoji}</span>
                        <span className="truncate">{t.menu[game.labelKey]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <KidButton
          color="purple"
          size="md"
          data-testid="session-start"
          disabled={!canStart}
          onClick={() => {
            if (!canStart) return;
            onStart({
              ageBand: age,
              minutes,
              mode,
              targetStars: selectedTarget,
              allowedGames,
              couponId: selectedCoupon,
            });
          }}
          className="w-full"
        >
          {t.sessionCard.start}
        </KidButton>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm font-bold text-slate-500 py-2"
        >
          {t.sessionCard.close}
        </button>
      </div>
    </div>
  );
}

export default SessionCard;
