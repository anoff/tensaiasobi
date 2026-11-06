import { useState, useRef, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import { useWakeLock } from './hooks/useWakeLock';
import KidButton from './components/KidButton';
import { BlockTile } from './components/BlockTile';
import { AgeSwitch } from './components/AgeSwitch';
import { CORAL, LEAF, BUTTER, CHALK, INK, PLAY_MAT_STYLE, hardShadow } from './theme/blockTable';
import { THEME_EMOJI, nextTheme, toAppTheme, type AppThemeId } from './theme/appTheme';
import { EmojiHalo, TILE_HALO_PX } from './components/EmojiHalo';
import { CATEGORY_EMOJI, categoryFill } from './theme/categories';
import HomeButton from './components/HomeButton';
import ParentGate from './components/ParentGate';
import ParentDashboard from './components/ParentDashboard';
import ParentGuide from './components/ParentGuide';
import SessionCard, { type SessionStartConfig } from './components/SessionCard';
import { I18nProvider, useTranslation } from './hooks/useTranslation';
import { GameFXProvider } from './hooks/useGameFX';
import GameConfetti from './components/GameConfetti';

import { StarCounter } from './components/StarCounter';
import { FlyUpStar } from './components/FlyUpStar';
import { CouponShop } from './components/CouponShop';
import { RedeemConfirmDialog, CouponCelebration } from './components/CouponRedeemDialogs';
import { couponLabel, type Coupon } from './types/gamification';
import { GAMES, GAME_CATEGORIES, clearPersistedProgress, gameVisibleForAge, gameVisibleInChallenge, gamesInCategory, isGameId, type AgeBand, type GameId } from './games/catalog';
import { useStars } from './hooks/useStars';
import { useStickers, type CapsuleAward } from './hooks/useStickers';
import StickerBook from './components/stickers/StickerBook';
import { StickerAward } from './components/stickers/StickerAward';
import { StickerHomeCard } from './components/stickers/StickerHomeCard';
import { accessoryById, bookTotals, collectibleById } from './data/stickers';
import { useCoupons } from './hooks/useCoupons';
import { useChallenge } from './hooks/useChallenge';
import { formatRemaining, useSessionTimer } from './hooks/useSessionTimer';
import { routeFromHash, routeHash, type HashRoute } from './games/gameLink';

type Screen = 'menu' | 'stickers' | 'coupons' | 'settings' | 'session' | 'guide' | GameId;
/** Grown-up screens reached through the parent gate: no Home button, never covered by the session lock. */
/** Grown-up screens: no Home button in the header, no session-lock overlay, and opening one doesn't start play. */
const isParentScreen = (screen: Screen) => screen === 'settings' || screen === 'session' || screen === 'guide';
/** Screens with their own URL hash (#/<game id>, #/guide); every other screen clears the hash. */
const hasHashRoute = (screen: Screen): screen is HashRoute => screen === 'guide' || isGameId(screen);
type ParentGateNext = 'settings' | 'session';

function AppContent() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('settings_sound_enabled', false);
  const [vibrationEnabled, setVibrationEnabled] = useLocalStorage<boolean>('settings_vibration_enabled', true);
  const { minutes: sessionMinutes, setMinutes: setSessionMinutes, remainingMs, locked: sessionLocked, startOrRefresh, startIfIdle, unlock } = useSessionTimer();
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

  /** The screen a direct link asks for: the guide, or a game if Learn mode allows it; else the menu (null). */
  const linkedRoute = (hash: string): HashRoute | null => {
    const route = routeFromHash(hash);
    if (route === 'guide') return route;
    const game = route && GAMES.find((g) => g.id === route);
    if (!game) return null;
    return gameVisibleInChallenge(game, { focusActive: challengeFocusActive, allowedGames: challengeAllowedGames }) ? game.id : null;
  };

  const [currentScreen, setCurrentScreen] = useState<Screen>(() => linkedRoute(window.location.hash) ?? 'menu');
  const [showParentGate, setShowParentGate] = useState(false);
  const [parentGateNext, setParentGateNext] = useState<ParentGateNext>('settings');

  const { playPop, playSuccess, playError, playSimonTone, playCue } = useSound(soundEnabled, vibrationEnabled);
  const { language, setLanguage, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const { stars, pendingAnimations, addStars, spendStars, clearAnimation, resetStars } = useStars();
  const stickers = useStickers();
  const { completeRound, buyAccessory } = stickers;
  /** Capsules won and waiting for their award overlay, oldest first. */
  const [awardQueue, setAwardQueue] = useState<CapsuleAward[]>([]);
  const finishAward = useCallback(() => setAwardQueue((q) => q.slice(1)), []);
  const { coupons, toggleCoupon, addCustomCoupon, removeCustomCoupon, awardCoupon, redeemCoupon, resetCoupons } = useCoupons();
  const [storedAgeBand, setAgeBand] = useLocalStorage<string>('settings_age_band', 'little');
  // App-wide theme (#74): a setting like sound, so "Reset all progress" keeps it.
  const [storedTheme, setTheme] = useLocalStorage<AppThemeId>('settings_app_theme', 'animals');
  const theme = toAppTheme(storedTheme);
  const [themeBumps, setThemeBumps] = useState(0);
  // Older installs may still hold 'all'; the home switch only knows two bands.
  const ageBand: AgeBand = storedAgeBand === 'big' ? 'big' : 'little';
  const [pendingCouponRedeemGateId, setPendingCouponRedeemGateId] = useState<string | null>(null);
  const [pendingCouponRedeemConfirmId, setPendingCouponRedeemConfirmId] = useState<string | null>(null);
  const [celebratingCoupon, setCelebratingCoupon] = useState<Coupon | null>(null);
  const [pendingEarnCouponId, setPendingEarnCouponId] = useState<string | null>(null);
  const [challengeSetupCouponId, setChallengeSetupCouponId] = useState<string | undefined>(undefined);

  // Keep the URL in step with the screen: a game or the guide gets its own history entry (#/<id>),
  // so a reload reopens it and browser Back lands on the menu; any other screen clears the hash.
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    if (hasHashRoute(currentScreen)) {
      if (routeFromHash(hash) !== currentScreen) window.history.pushState(null, '', routeHash(currentScreen));
    } else if (hash) {
      window.history.replaceState(null, '', pathname + search);
    }
  }, [currentScreen]);

  /** Latest screen and link resolver for the popstate listener, which subscribes once. */
  const linkState = useRef({ currentScreen, linkedRoute, startIfIdle });
  useEffect(() => {
    linkState.current = { currentScreen, linkedRoute, startIfIdle };
  });

  // Opening a game by link counts as starting play, like tapping its tile.
  useEffect(() => {
    if (isGameId(linkState.current.currentScreen)) linkState.current.startIfIdle();
  }, []);

  // Browser Back/Forward and hand-edited hashes.
  useEffect(() => {
    const onPopState = () => {
      const { currentScreen: current, linkedRoute: resolve, startIfIdle: start } = linkState.current;
      const target = resolve(window.location.hash);
      if (target) {
        if (target !== current) {
          if (isGameId(target)) start();
          setCurrentScreen(target);
        }
        return;
      }
      if (!hasHashRoute(current)) return;
      // A game with an inner screen (Magic Puzzle) takes Back first, like the hardware Back button.
      if (isGameId(current) && !window.dispatchEvent(new Event('app-back', { cancelable: true }))) {
        window.history.pushState(null, '', routeHash(current));
        return;
      }
      setCurrentScreen('menu');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleStarEarned = (amount: number) => {
    if (challengeFocusActive) addChallengeStars(amount);
    else addStars(amount);
  };

  /** A finished round rolls for a capsule from that game's shelf (daily curve, pure chance, never removed). */
  const handleRoundComplete = (gameId: GameId) => {
    const shelf = GAMES.find((game) => game.id === gameId)?.category;
    if (!shelf) return;
    const awarded = completeRound(shelf);
    if (awarded) setAwardQueue((q) => [...q, awarded]);
  };

  const handleBuyAccessory = (accessoryId: string): boolean => {
    const accessory = accessoryById(accessoryId);
    if (!accessory || stickers.book.ownedAccessories.includes(accessoryId)) return false;
    if (stars < accessory.price) {
      playError();
      return false;
    }
    spendStars(accessory.price);
    buyAccessory(accessoryId);
    playSuccess();
    return true;
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
      // A game with its own inner screen (Magic Puzzle's gallery) can take Back by cancelling this event.
      if (isGameId(currentScreen) && !window.dispatchEvent(new Event('app-back', { cancelable: true }))) {
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
    if (sessionLocked && !isParentScreen(screen) && screen !== 'menu') return;
    if (screen !== 'menu' && !isParentScreen(screen)) startIfIdle();
    setCurrentScreen(screen);
  };

  const handleClearProgress = () => {
    clearPersistedProgress();
    resetStars();
    resetCoupons();
    stickers.resetStickers();
    setAwardQueue([]);
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

  const visibleGames = GAMES.filter(
    (game) =>
      gameVisibleInChallenge(game, { focusActive: challengeFocusActive, allowedGames: challengeAllowedGames }) &&
      gameVisibleForAge(game, ageBand),
  );

  const renderActiveScreen = () => {
    if (isGameId(currentScreen)) {
      const gameId = currentScreen;
      const Game = GAMES.find((game) => game.id === gameId)?.Component;
      if (!Game) return null;
      return (
        <GameFXProvider
          value={{
            playPop,
            playSuccess,
            playError,
            playSimonTone,
            onStarEarned: handleStarEarned,
            onRoundComplete: () => handleRoundComplete(gameId),
            challengeMode: challengeFocusActive,
            ageBand,
            theme,
            setTheme,
          }}
        >
          <Game key={language} />
        </GameFXProvider>
      );
    }

    switch (currentScreen) {
      case 'stickers':
        return (
          <StickerBook
            book={stickers.book}
            stars={stars}
            onBuyAccessory={handleBuyAccessory}
            onPlaceAccessory={stickers.placeAccessory}
            onRemoveAccessory={stickers.removeAccessory}
            pageEdits={stickers.pages}
            onSeen={stickers.markSeen}
            playPop={playPop}
            onHome={() => handleScreenChange('menu')}
            status={statusBadges}
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
      case 'guide':
        return <ParentGuide onBack={() => handleScreenChange('menu')} />;
      default:
        return null;
    }
  };

  /** Session time, challenge badges and the star pill: in the app header, or in the sticker book's own top bar. */
  const statusBadges = (
    <>
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
      compact={currentScreen === 'stickers'}
    />
    </>
  );

  return (
    <div className="w-screen h-[100dvh] flex flex-col relative pt-safe pb-safe text-[#2a1c14]" style={PLAY_MAT_STYLE}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-40 flex h-1.5">
        <span className="flex-1" style={{ backgroundColor: CORAL }} />
        <span className="flex-1" style={{ backgroundColor: LEAF }} />
        <span className="flex-1" style={{ backgroundColor: BUTTER }} />
      </div>
      {currentScreen !== 'stickers' && (
        <header className="flex justify-between items-center p-4 short:p-2 tiny:p-1.5 z-50">
          <div>
            {currentScreen !== 'menu' && !isParentScreen(currentScreen) && (
              <HomeButton data-testid="home-button" onClick={() => handleScreenChange('menu')} />
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {statusBadges}

            {currentScreen === 'menu' && (
              <div className="flex items-center gap-3">
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
      )}

      <main
        className={
          currentScreen === 'stickers'
            ? 'flex-1 flex flex-col min-h-0 overflow-hidden [&:has([data-page-scroll])]:overflow-y-auto overscroll-y-contain px-4 pt-1.5 pb-2'
            : currentScreen === 'menu'
              ? 'flex-1 flex flex-col overflow-y-auto overscroll-y-contain px-4'
              : 'flex-1 flex flex-col overflow-y-auto overscroll-y-contain px-4 pb-6 short:pb-2'
        }
      >
        {currentScreen === 'menu' ? (
          <div className="min-h-full flex flex-col justify-between max-w-md mx-auto w-full shrink-0 pt-6 pb-4 select-none">
            <div className="text-center space-y-2 mt-4">
              <div className="flex items-center justify-center gap-[14px]">
                <h1 className="text-4xl font-black tracking-tight text-[#2a1c14]">tensaiasobi</h1>
                <button
                  type="button"
                  data-testid="theme-button"
                  data-theme={theme}
                  aria-label={`${t.menu.theme}: ${t.menu.themes[theme]}`}
                  onClick={() => {
                    playPop();
                    setTheme(nextTheme(theme));
                    setThemeBumps((n) => n + 1);
                  }}
                  className="relative shrink-0 flex h-14 w-14 tiny:h-12 tiny:w-12 items-center justify-center rounded-2xl border-[3px] cursor-pointer select-none touch-manipulation outline-none transition-all duration-75 active:translate-x-[3px] active:translate-y-[4px] active:[box-shadow:none] focus-visible:ring-4 focus-visible:ring-amber-400/70"
                  style={{ backgroundColor: '#fff8ec', borderColor: INK, boxShadow: hardShadow(3, 4) }}
                >
                  <EmojiHalo
                    key={themeBumps}
                    radius={TILE_HALO_PX}
                    className={`text-[32px] tiny:text-[28px] leading-none ${themeBumps > 0 ? 'animate-card-in' : ''}`}
                  >
                    {THEME_EMOJI[theme]}
                  </EmojiHalo>
                  <span
                    aria-hidden
                    className="absolute -right-[9px] -top-[9px] flex h-6 w-6 items-center justify-center rounded-full border-2 text-[12px] leading-none"
                    style={{ backgroundColor: BUTTER, borderColor: INK }}
                  >
                    🎨
                  </span>
                </button>
              </div>
              <p className="text-[#2a1c14]/50 font-extrabold text-base">{t.menu.subtitle}</p>
            </div>

            <div className="my-8 space-y-7">
              <AgeSwitch
                value={ageBand}
                onChange={(band) => {
                  playPop();
                  setAgeBand(band);
                }}
              />

              {!challengeFocusActive && (
                <section data-testid="category-stickers" className="space-y-3">
                  <h2 className="flex items-center gap-2 text-lg font-black tracking-tight" style={{ color: INK }}>
                    <span
                      aria-hidden
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-[3px] text-lg leading-none"
                      style={{ backgroundColor: CHALK, borderColor: INK }}
                    >
                      📒
                    </span>
                    {t.menu.stickerBook}
                  </h2>
                  <StickerHomeCard
                    book={stickers.book}
                    totals={bookTotals(stickers.book)}
                    onClick={() => handleScreenChange('stickers')}
                  />
                </section>
              )}

              {GAME_CATEGORIES.map((category) => {
                const games = gamesInCategory(visibleGames, category);
                const rewards = category === 'play' && !challengeFocusActive
                  ? [
                      { id: 'coupons', emoji: '🎟️', label: t.menu.coupons, testid: 'launch-coupons', screen: 'coupons' as const },
                    ]
                  : [];
                if (games.length === 0 && rewards.length === 0) return null;
                return (
                  <section key={category} data-testid={`category-${category}`} className="space-y-3">
                    <h2 className="flex items-center gap-2 text-lg font-black tracking-tight" style={{ color: INK }}>
                      <span
                        aria-hidden
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-[3px] text-lg leading-none"
                        style={{ backgroundColor: categoryFill(category, 0), borderColor: INK }}
                      >
                        {CATEGORY_EMOJI[category]}
                      </span>
                      {t.menu.categories[category]}
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                      {games.map((game, i) => (
                        <BlockTile
                          key={game.id}
                          emoji={game.emoji}
                          glyphSrc={'glyphSrc' in game ? game.glyphSrc : undefined}
                          label={t.menu[game.labelKey]}
                          index={i}
                          fill={categoryFill(category, i)}
                          tileId={game.id}
                          data-testid={game.testid}
                          onClick={() => handleScreenChange(game.id)}
                        />
                      ))}
                      {rewards.map((reward, i) => (
                        <BlockTile
                          key={reward.id}
                          emoji={reward.emoji}
                          label={reward.label}
                          index={games.length + i}
                          fill={categoryFill(category, games.length + i)}
                          tileId={reward.id}
                          data-testid={reward.testid}
                          onClick={() => handleScreenChange(reward.screen)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="text-center text-xs text-[#2a1c14]/35 font-bold">
              {t.menu.footer}
              <div className="text-[10px] text-slate-400/80 font-mono mt-1" data-testid="git-hash">
                <a href="https://github.com/anoff/tensaiasobi" target="_blank">
                  v-{__GIT_HASH__}
                </a>
              </div>
              {/* Quiet grown-up footer row (#30, #31): read-only guide, so no parent gate. */}
              <button
                type="button"
                data-testid="home-guide"
                onClick={() => handleScreenChange('guide')}
                className="mt-6 block w-full h-11 rounded-[1.6rem] border text-base font-bold cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70"
                style={{ backgroundColor: '#fff8ec', borderColor: '#D3E3F1', color: '#1E3A5F' }}
              >
                {t.guide.homeRow}
              </button>
            </div>
          </div>
        ) : (
          renderActiveScreen()
        )}
      </main>

      {showParentGate && (
        <ParentGate
          onSuccess={() => {
            setShowParentGate(false);
            setCurrentScreen(parentGateNext);
          }}
          onClose={() => setShowParentGate(false)}
        />
      )}

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

      {celebratingCoupon && (
        <CouponCelebration
          coupon={celebratingCoupon}
          onClose={() => setCelebratingCoupon(null)}
        />
      )}

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

      {awardQueue.length > 0 && (() => {
        const { copy, count } = awardQueue[0];
        const sticker = collectibleById(copy.id);
        return sticker ? (
          <StickerAward key={copy.uid} sticker={sticker} shiny={copy.shiny} count={count} onDone={finishAward} playCue={playCue} />
        ) : null;
      })()}

      {sessionLocked && !isParentScreen(currentScreen) && (
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
