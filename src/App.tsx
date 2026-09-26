import { useState, useRef, useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import { useWakeLock } from './hooks/useWakeLock';
import KidButton from './components/KidButton';
import { BlockTile, tileFill, tileTilt } from './components/BlockTile';
import HomeButton from './components/HomeButton';
import ParentGate from './components/ParentGate';
import ParentDashboard from './components/ParentDashboard';
import SessionCard, { type SessionStartConfig } from './components/SessionCard';
import { I18nProvider, useTranslation } from './hooks/useTranslation';
import { GameFXProvider } from './hooks/useGameFX';
import GameConfetti from './components/GameConfetti';

import { StarCounter } from './components/StarCounter';
import { FlyUpStar } from './components/FlyUpStar';
import { CouponShop } from './components/CouponShop';
import { RedeemConfirmDialog, CouponCelebration } from './components/CouponRedeemDialogs';
import { couponLabel, type Coupon } from './types/gamification';
import { TownBuilder } from './games/TownBuilder';
import { GAMES, clearPersistedProgress, gameVisibleForAge, gameVisibleInChallenge, isGameId, type AgeBandFilter, type GameId } from './games/catalog';
import { useStars } from './hooks/useStars';
import { useCoupons } from './hooks/useCoupons';
import { useChallenge } from './hooks/useChallenge';
import { formatRemaining, useSessionTimer } from './hooks/useSessionTimer';

type Screen = 'menu' | 'town' | 'coupons' | 'settings' | 'session' | GameId;
type ParentGateNext = 'settings' | 'session';

function AppContent() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('settings_sound_enabled', false);
  const [vibrationEnabled, setVibrationEnabled] = useLocalStorage<boolean>('settings_vibration_enabled', true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [showParentGate, setShowParentGate] = useState(false);
  const [parentGateNext, setParentGateNext] = useState<ParentGateNext>('settings');

  const { playPop, playSuccess, playError, playAnimalSound, playCarHonk, playDoorChime, playWindBreeze } =
    useSound(soundEnabled, vibrationEnabled);
  const { language, setLanguage, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Gamification state
  const { stars, pendingAnimations, addStars, spendStars, clearAnimation, resetStars } = useStars();
  const { coupons, toggleCoupon, addCustomCoupon, removeCustomCoupon, awardCoupon, redeemCoupon, resetCoupons } = useCoupons();
  const [ageBand, setAgeBand] = useLocalStorage<AgeBandFilter>('settings_age_band', 'all');
  const { minutes: sessionMinutes, setMinutes: setSessionMinutes, remainingMs, locked: sessionLocked, startOrRefresh, startIfIdle, unlock } = useSessionTimer();
  const [pendingCouponRedeemGateId, setPendingCouponRedeemGateId] = useState<string | null>(null);
  const [pendingCouponRedeemConfirmId, setPendingCouponRedeemConfirmId] = useState<string | null>(null);
  const [celebratingCoupon, setCelebratingCoupon] = useState<Coupon | null>(null);
  const [pendingEarnCouponId, setPendingEarnCouponId] = useState<string | null>(null);
  const [challengeSetupCouponId, setChallengeSetupCouponId] = useState<string | undefined>(undefined);

  // Challenge mode state
  const {
    challengeActive,
    challengeStarsTarget,
    challengeStarsRemaining,
    challengeAllowedGames,
    challengeCouponId,
    challengePlayUnlocked,
    pendingChallengeAnimations,
    addChallengeStars,
    clearChallengeAnimation,
    startChallenge,
    cancelChallenge,
    claimChallengeReward,
  } = useChallenge();

  const challengeFocusActive = challengeActive && !challengePlayUnlocked;

  const handleStarEarned = (amount: number) => {
    if (challengeFocusActive) addChallengeStars(amount);
    else addStars(amount);
  };

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  useEffect(() => {
    let removed = false;
    let handle: { remove: () => Promise<void> } | undefined;

    CapacitorApp.addListener('backButton', () => {
      if (showParentGate) {
        setShowParentGate(false);
        return;
      }
      if (pendingEarnCouponId) {
        setPendingEarnCouponId(null);
        return;
      }
      if (pendingCouponRedeemConfirmId) {
        setPendingCouponRedeemConfirmId(null);
        return;
      }
      if (pendingCouponRedeemGateId) {
        setPendingCouponRedeemGateId(null);
        return;
      }
      if (celebratingCoupon) {
        setCelebratingCoupon(null);
        return;
      }
      if (currentScreen !== 'menu') {
        setCurrentScreen('menu');
        return;
      }
      CapacitorApp.exitApp();
    }).then((listener) => {
      if (removed) {
        void listener.remove();
        return;
      }
      handle = listener;
    });

    return () => {
      removed = true;
      void handle?.remove();
    };
  }, [
    showParentGate,
    pendingEarnCouponId,
    pendingCouponRedeemConfirmId,
    pendingCouponRedeemGateId,
    celebratingCoupon,
    currentScreen,
  ]);

  const handleScreenChange = (screen: Screen) => {
    playPop();
    if (screen !== 'settings' && screen !== 'session') setChallengeSetupCouponId(undefined);
    if (sessionLocked && screen !== 'settings' && screen !== 'session' && screen !== 'menu') return;
    if (screen !== 'menu' && screen !== 'settings' && screen !== 'session') startIfIdle();
    setCurrentScreen(screen);
  };

  const handleClearProgress = () => {
    clearPersistedProgress();
    resetStars();
    resetCoupons();
    cancelChallenge();
    playSuccess();
  };

  const handleStartSession = (config: SessionStartConfig) => {
    setAgeBand(config.ageBand);
    setSessionMinutes(config.minutes);
    if (config.minutes > 0) startOrRefresh(config.minutes);
    else unlock();
    if (config.mode === 'learn') {
      startChallenge(config.targetStars, config.allowedGames, config.couponId);
    } else {
      cancelChallenge();
    }
    handleScreenChange('menu');
  };

  const renderActiveScreen = () => {
    if (isGameId(currentScreen)) {
      const Game = GAMES.find((game) => game.id === currentScreen)?.Component;
      if (!Game) return null;
      return (
        <GameFXProvider
          value={{
            playPop,
            playSuccess,
            playError,
            onStarEarned: handleStarEarned,
            challengeMode: challengeFocusActive,
          }}
        >
          <Game key={language} />
        </GameFXProvider>
      );
    }

    switch (currentScreen) {
      case 'town':
        return (
          <TownBuilder
            stars={stars}
            spendStars={spendStars}
            addStars={(amt) => addStars(amt)}
            playPop={playPop}
            playSuccess={playSuccess}
            playAnimalSound={playAnimalSound}
            playCarHonk={playCarHonk}
            playDoorChime={playDoorChime}
            playWindBreeze={playWindBreeze}
          />
        );
      case 'coupons':
        return (
          <CouponShop
            coupons={coupons}
            onRedeemCoupon={(id) => setPendingCouponRedeemConfirmId(id)}
            onEarnCoupon={(id) => setPendingEarnCouponId(id)}
            playPop={playPop}
          />
        );
      case 'session':
        return (
          <SessionCard
            ageBand={ageBand}
            sessionMinutes={sessionMinutes}
            coupons={coupons}
            challengeActive={challengeActive}
            challengePlayUnlocked={challengePlayUnlocked}
            challengeStarsTarget={challengeStarsTarget}
            challengeAllowedGames={challengeAllowedGames}
            challengeCouponId={challengeCouponId}
            initialCouponId={challengeSetupCouponId}
            onStart={handleStartSession}
            onEndSession={() => {
              cancelChallenge();
              unlock();
            }}
            onClose={() => handleScreenChange('menu')}
          />
        );
      case 'settings':
        return (
          <ParentDashboard
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            vibrationEnabled={vibrationEnabled}
            setVibrationEnabled={setVibrationEnabled}
            coupons={coupons}
            onToggleCoupon={toggleCoupon}
            onClearProgress={handleClearProgress}
            onClose={() => handleScreenChange('menu')}
            onAddCoupon={addCustomCoupon}
            onRemoveCoupon={removeCustomCoupon}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`w-screen h-[100dvh] flex flex-col relative pt-safe pb-safe ${
        currentScreen === 'menu' ? 'text-[#2a1c14]' : 'bg-sky-50 text-slate-800'
      }`}
      style={
        currentScreen === 'menu'
          ? {
              backgroundColor: '#ffe7c2',
              backgroundImage:
                'radial-gradient(circle at 12px 12px, rgba(42,28,20,0.07) 1.6px, transparent 1.8px)',
              backgroundSize: '28px 28px',
            }
          : undefined
      }
    >
      {currentScreen === 'menu' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-40 flex h-1.5"
        >
          <span className="flex-1" style={{ backgroundColor: '#ff4d3a' }} />
          <span className="flex-1" style={{ backgroundColor: '#1f9a62' }} />
          <span className="flex-1" style={{ backgroundColor: '#ffc21a' }} />
        </div>
      )}
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center p-4 z-50">
        <div>
          {currentScreen !== 'menu' && currentScreen !== 'settings' && currentScreen !== 'session' && (
            <HomeButton data-testid="home-button" onClick={() => handleScreenChange('menu')} />
          )}
        </div>

        {/* Universal Star Counter displaying earned stars & animating fly-ups */}
        <div className="flex items-center gap-3 ml-auto">
          {sessionMinutes > 0 && remainingMs > 0 && !sessionLocked && (
            <div className="flex items-center gap-1.5 bg-white/90 border-2 border-slate-300 rounded-full px-3 py-1.5" data-testid="session-remaining">
              <span className="text-sm">⏱️</span>
              <span className="text-sm font-black text-slate-700 tabular-nums">{formatRemaining(remainingMs)}</span>
            </div>
          )}

          {challengeFocusActive && (
            <div className="relative" data-testid="challenge-countdown-badge">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300 rounded-full px-3 py-1.5 shadow-sm select-none justify-center">
                <span className="text-lg">🎯</span>
                <span className="text-xs font-black text-purple-800 uppercase tracking-wider hidden xs:inline">
                  {t.challenge.starsToGo}
                </span>
                <span className="text-base font-black text-pink-600 tabular-nums animate-pulse" data-testid="challenge-stars-remaining">
                  {challengeStarsRemaining}
                </span>
              </div>

              {/* Countdown fly-down/up animations */}
              {pendingChallengeAnimations.map((anim) => (
                <FlyUpStar key={anim.id} onDone={() => clearChallengeAnimation(anim.id)}>
                  <span className="text-sm font-black text-pink-600 whitespace-nowrap drop-shadow-sm">
                    -{anim.amount} ⭐
                  </span>
                </FlyUpStar>
              ))}
            </div>
          )}

          {challengeActive && challengePlayUnlocked && (
            <div
              className="flex items-center gap-1.5 bg-emerald-100 border-2 border-emerald-300 rounded-full px-3 py-1.5 shadow-sm select-none"
              data-testid="challenge-play-unlocked-badge"
            >
              <span className="text-lg">🎉</span>
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                {t.challenge.playUnlockedBadge}
              </span>
            </div>
          )}

          <StarCounter
            stars={stars}
            pendingAnimations={pendingAnimations}
            clearAnimation={clearAnimation}
          />

          {currentScreen === 'menu' && (
            <div className="flex items-center gap-3">
              {/* Language Switcher Dropdown */}
              <div className="relative" ref={langRef}>
                {(() => {
                  const labelMap = { en: '🇬🇧', de: '🇩🇪', ja: '🇯🇵', fr: '🇫🇷', ko: '🇰🇷' } as const;
                  const options = (['en', 'de', 'ja', 'fr', 'ko'] as const).filter((l) => l !== language);
                  return (
                    <>
                      <button
                        data-testid="lang-dropdown-trigger"
                        type="button"
                        aria-label={t.menu.language}
                        aria-expanded={langOpen}
                        aria-haspopup="listbox"
                        onClick={() => { playPop(); setLangOpen((o) => !o); }}
                        className="flex items-center gap-1 bg-white/90 border-2 border-slate-300 rounded-full px-3 py-1.5 text-base shadow-sm cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 hover:bg-slate-50 transition-all"
                      >
                        {labelMap[language]}
                        <span className="text-slate-400 text-xs">{langOpen ? '▲' : '▼'}</span>
                      </button>
                      {langOpen && (
                        <div className="absolute left-0 top-full mt-1 bg-white border-2 border-slate-200 rounded-2xl shadow-lg py-1 flex flex-col z-50 min-w-full">
                          {options.map((lang) => (
                            <button
                              key={lang}
                              data-testid={`lang-select-${lang}`}
                              onClick={() => { playPop(); setLanguage(lang); setLangOpen(false); }}
                              className="px-3 py-1.5 text-base hover:bg-slate-50 cursor-pointer outline-none transition-colors"
                            >
                              {labelMap[lang]}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <button
                type="button"
                data-testid="open-session"
                onClick={() => {
                  playPop();
                  setParentGateNext('session');
                  setShowParentGate(true);
                }}
                className="bg-purple-500 text-white border-2 border-purple-700 rounded-full px-4 py-2 text-sm font-extrabold hover:bg-purple-600 cursor-pointer shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-purple-300"
              >
                ▶️ {t.menu.session}
              </button>
              <button
                type="button"
                data-testid="open-settings"
                onClick={() => {
                  playPop();
                  setParentGateNext('settings');
                  setShowParentGate(true);
                }}
                className="bg-white/90 border-2 border-slate-300 rounded-full px-3 py-2 text-sm font-extrabold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
                aria-label={t.menu.parents}
              >
                ⚙️
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto overscroll-y-contain px-4 pb-6">
        {currentScreen === 'menu' ? (
          <div className="min-h-full flex flex-col justify-between max-w-md mx-auto w-full py-6 select-none">
            {/* Title Block */}
            <div className="text-center space-y-2 mt-4">
              <h1 className="text-4xl font-black tracking-tight text-[#2a1c14]">
                tensaiasobi 🎮
              </h1>
              <p className="text-[#2a1c14]/50 font-extrabold text-base">{t.menu.subtitle}</p>
            </div>

            {/* Block-table launchers: 3 equal columns, same tile for games + town/coupons */}
            <div className="grid grid-cols-3 gap-3 my-8">
              {GAMES.map((game, i) => {
                if (!gameVisibleInChallenge(game, { focusActive: challengeFocusActive, allowedGames: challengeAllowedGames })) return null;
                if (!gameVisibleForAge(game, ageBand)) return null;
                return (
                  <BlockTile
                    key={game.id}
                    emoji={game.emoji}
                    label={t.menu[game.labelKey]}
                    fill={tileFill(i)}
                    tilt={tileTilt(game.id)}
                    data-testid={game.testid}
                    onClick={() => handleScreenChange(game.id)}
                  />
                );
              })}
              {!challengeFocusActive && (
                <>
                  <BlockTile
                    emoji="🏘️"
                    label={t.menu.town}
                    fill={tileFill(GAMES.length)}
                    tilt={tileTilt('town')}
                    data-testid="launch-town"
                    onClick={() => handleScreenChange('town')}
                  />
                  <BlockTile
                    emoji="🎟️"
                    label={t.menu.coupons}
                    fill={tileFill(GAMES.length + 1)}
                    tilt={tileTilt('coupons')}
                    data-testid="launch-coupons"
                    onClick={() => handleScreenChange('coupons')}
                  />
                </>
              )}
            </div>

            <div className="text-center text-xs text-[#2a1c14]/35 font-bold">
              {t.menu.footer}
              <div className="text-[10px] text-slate-400/80 font-mono mt-1" data-testid="git-hash">
                <a href="https://github.com/anoff/tensaiasobi" target="_blank">
                  v-{__GIT_HASH__}
                </a>
              </div>
            </div>
          </div>
        ) : (
          renderActiveScreen()
        )}
      </main>

      {/* Parent Gate Dialog */}
      {showParentGate && (
        <ParentGate
          onSuccess={() => {
            setShowParentGate(false);
            setCurrentScreen(parentGateNext);
          }}
          onClose={() => setShowParentGate(false)}
        />
      )}

      {/* Parent Gate for the Coupon Shop's "Earn it!" shortcut -> opens Challenge configuration with this coupon preselected */}
      {pendingEarnCouponId && (
        <ParentGate
          onSuccess={() => {
            setChallengeSetupCouponId(pendingEarnCouponId);
            setPendingEarnCouponId(null);
            setCurrentScreen('session');
          }}
          onClose={() => setPendingEarnCouponId(null)}
        />
      )}

      {/* Confirmation dialog for Coupon Redemption (first confirmation, triggered by the tap-and-hold gesture) */}
      {pendingCouponRedeemConfirmId && (() => {
        const coupon = coupons.find((c) => c.id === pendingCouponRedeemConfirmId);
        if (!coupon) return null;
        return (
          <RedeemConfirmDialog
            coupon={coupon}
            onCancel={() => setPendingCouponRedeemConfirmId(null)}
            onConfirm={() => {
              setPendingCouponRedeemConfirmId(null);
              setPendingCouponRedeemGateId(coupon.id);
            }}
          />
        );
      })()}

      {/* Parent Gate for Coupon Redemption (second confirmation, before the coupon is actually consumed) */}
      {pendingCouponRedeemGateId && (
        <ParentGate
          onSuccess={() => {
            const id = pendingCouponRedeemGateId;
            setPendingCouponRedeemGateId(null);
            const coupon = coupons.find((c) => c.id === id);
            const success = redeemCoupon(id);
            if (success && coupon) {
              playSuccess();
              setCelebratingCoupon(coupon);
            } else {
              playError();
            }
          }}
          onClose={() => setPendingCouponRedeemGateId(null)}
        />
      )}

      {/* Celebration overlay shown after a coupon has been redeemed */}
      {celebratingCoupon && (
        <CouponCelebration
          coupon={celebratingCoupon}
          onClose={() => setCelebratingCoupon(null)}
        />
      )}

      {/* Challenge Unlocked Celebration Overlay */}
      {challengeFocusActive && challengeStarsRemaining === 0 && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300" data-testid="challenge-completion-modal">
          <GameConfetti pieces={200} />
          <div className="bg-white rounded-[3rem] border-8 border-purple-400 p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <span className="text-8xl block animate-bounce">🏆🎉</span>
            <h2 className="text-3xl font-black text-purple-800 leading-tight">
              {t.challenge.completeTitle}
            </h2>
            <p className="text-slate-500 font-extrabold text-sm">
              {t.challenge.completeBody}
            </p>

            <div className="flex justify-center items-center gap-1.5 bg-yellow-100 border-2 border-yellow-300 rounded-2xl py-3 px-6 animate-pulse">
              <span className="text-2xl">⭐</span>
              <span className="text-xl font-black text-yellow-800">+{challengeStarsTarget} Stars!</span>
            </div>

            {challengeCouponId && (
              <div
                className="flex justify-center items-center gap-1.5 bg-violet-100 border-2 border-violet-300 rounded-2xl py-3 px-6 animate-pulse"
                data-testid="challenge-coupon-reward"
              >
                {(() => {
                  const coupon = coupons.find((c) => c.id === challengeCouponId);
                  if (!coupon) return null;
                  return (
                    <>
                      <span className="text-2xl">{coupon.emoji}</span>
                      <span className="text-lg font-black text-violet-800">
                        {couponLabel(coupon, t.coupons.couponNames)}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}

            <KidButton
              color="green"
              size="lg"
              data-testid="claim-challenge-reward-button"
              onClick={() => {
                playSuccess();
                addStars(challengeStarsTarget);
                if (challengeCouponId) awardCoupon(challengeCouponId);
                claimChallengeReward();
                setCurrentScreen('menu');
              }}
              className="w-full rounded-2xl tracking-wider uppercase"
            >
              {t.challenge.claimPlay.replace('{count}', challengeStarsTarget.toString())}
            </KidButton>
          </div>
        </div>
      )}

      {sessionLocked && currentScreen !== 'settings' && currentScreen !== 'session' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 p-6" data-testid="session-locked">
          <div className="bg-white rounded-[2rem] border-4 border-slate-300 p-8 max-w-sm w-full text-center space-y-4">
            <span className="text-6xl block">⏰</span>
            <h2 className="text-2xl font-black text-slate-800">{t.session.timesUpTitle}</h2>
            <p className="text-slate-500 font-bold text-sm">{t.session.timesUpBody}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  useWakeLock();
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;
