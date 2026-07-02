import { useState, useRef, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import KidButton from './components/KidButton';
import HomeButton from './components/HomeButton';
import ParentGate from './components/ParentGate';
import ParentDashboard from './components/ParentDashboard';
import MathGame from './games/MathGame';
import OddOneOut from './games/OddOneOut';
import DoodlePad from './games/DoodlePad';
import MemoryMatch from './games/MemoryMatch';
import MazeGame from './games/MazeGame';
import ShapeTrace from './games/ShapeTrace';
import AnlautGame from './games/AnlautGame';
import EmojiMatch from './games/EmojiMatch';
import Shiritori from './games/Shiritori';
import { I18nProvider, useTranslation } from './hooks/useTranslation';
import Confetti from 'react-confetti';

// Gamification imports
import { StarCounter } from './components/StarCounter';
import { StarShop } from './components/StarShop';
import { TownBuilder } from './games/TownBuilder';
import { useStars } from './hooks/useStars';
import { useVouchers } from './hooks/useVouchers';
import { useChallenge } from './hooks/useChallenge';

type Screen = 'menu' | 'math' | 'odd' | 'doodle' | 'memory' | 'maze' | 'trace' | 'anlaut' | 'emojiMatch' | 'town' | 'shop' | 'settings' | 'shiritori';

function AppContent() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('settings_sound_enabled', true);
  const [vibrationEnabled, setVibrationEnabled] = useLocalStorage<boolean>('settings_vibration_enabled', true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [showParentGate, setShowParentGate] = useState(false);

  const { playPop, playSuccess, playError } = useSound(soundEnabled, vibrationEnabled);
  const { language, setLanguage, t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Gamification state
  const { stars, pendingAnimations, addStars, spendStars, clearAnimation, resetStars } = useStars();
  const { vouchers, setVoucherCost, toggleVoucher, redeemVoucher, resetVouchers } = useVouchers();
  const [pendingVoucherRedeemId, setPendingVoucherRedeemId] = useState<string | null>(null);

  // Challenge mode state
  const {
    challengeActive,
    challengeStarsTarget,
    challengeStarsRemaining,
    challengeAllowedGames,
    pendingChallengeAnimations,
    addChallengeStars,
    clearChallengeAnimation,
    startChallenge,
    cancelChallenge,
    claimChallengeReward,
  } = useChallenge();

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

  const handleScreenChange = (screen: Screen) => {
    playPop();
    setCurrentScreen(screen);
  };

  const handleClearProgress = () => {
    localStorage.removeItem('math_streak');
    localStorage.removeItem('math_highscore');
    localStorage.removeItem('odd_streak');
    localStorage.removeItem('odd_highscore');
    localStorage.removeItem('anlaut_streak');
    localStorage.removeItem('anlaut_highscore');
    localStorage.removeItem('shiritori_highscore');
    
    // Clear Emoji Match progress
    localStorage.removeItem('dobble_high_solo_zen_easy');
    localStorage.removeItem('dobble_high_solo_zen_medium');
    localStorage.removeItem('dobble_high_solo_zen_hard');
    localStorage.removeItem('dobble_high_solo_time_medium');
    localStorage.removeItem('dobble_high_solo_time_hard');
    
    // Clear gamification progress
    resetStars();
    resetVouchers();
    localStorage.removeItem('gamification_town');
    
    playSuccess();
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'math':
        return (
          <MathGame
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
            challengeMode={challengeActive}
          />
        );
      case 'odd':
        return (
          <OddOneOut
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
            challengeMode={challengeActive}
          />
        );
      case 'doodle':
        return <DoodlePad playPop={playPop} />;
      case 'memory':
        return (
          <MemoryMatch
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
          />
        );
      case 'maze':
        return (
          <MazeGame
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
          />
        );
      case 'trace':
        return (
          <ShapeTrace
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
          />
        );
      case 'anlaut':
        return (
          <AnlautGame
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
            challengeMode={challengeActive}
          />
        );
      case 'emojiMatch':
        return (
          <EmojiMatch
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
            challengeMode={challengeActive}
          />
        );
      case 'shiritori':
        return (
          <Shiritori
            key={language}
            playPop={playPop}
            playSuccess={playSuccess}
            playError={playError}
            onStarEarned={(amt) => challengeActive ? addChallengeStars(amt) : addStars(amt)}
            challengeMode={challengeActive}
          />
        );
      case 'town':
        return (
          <TownBuilder
            stars={stars}
            spendStars={spendStars}
            addStars={(amt) => addStars(amt)}
            playPop={playPop}
            playSuccess={playSuccess}
          />
        );
      case 'shop':
        return (
          <StarShop
            stars={stars}
            vouchers={vouchers}
            onRedeemVoucher={(id) => setPendingVoucherRedeemId(id)}
            playPop={playPop}
          />
        );
      case 'settings':
        return (
          <ParentDashboard
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            vibrationEnabled={vibrationEnabled}
            setVibrationEnabled={setVibrationEnabled}
            vouchers={vouchers}
            onToggleVoucher={toggleVoucher}
            onSetVoucherCost={setVoucherCost}
            onClearProgress={handleClearProgress}
            onClose={() => handleScreenChange('menu')}
            challengeActive={challengeActive}
            challengeStarsTarget={challengeStarsTarget}
            challengeAllowedGames={challengeAllowedGames}
            onStartChallenge={startChallenge}
            onCancelChallenge={cancelChallenge}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-screen h-[100dvh] flex flex-col bg-sky-50 text-slate-800 relative">
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center p-4 z-10">
        <div>
          {currentScreen !== 'menu' && currentScreen !== 'settings' && (
            <HomeButton data-testid="home-button" onClick={() => handleScreenChange('menu')} />
          )}
        </div>

        {/* Universal Star Counter displaying earned stars & animating fly-ups */}
        <div className="flex items-center gap-3 ml-auto">
          {challengeActive && (
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
                <div
                  key={anim.id}
                  onAnimationEnd={() => clearChallengeAnimation(anim.id)}
                  className="absolute left-1/2 -translate-x-1/2 pointer-events-none star-fly-up"
                >
                  <span className="text-sm font-black text-pink-600 whitespace-nowrap drop-shadow-sm">
                    -{anim.amount} ⭐
                  </span>
                </div>
              ))}
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
                  const labelMap = { en: '🇬🇧', de: '🇩🇪', ja: '🇯🇵' } as const;
                  const options = (['en', 'de', 'ja'] as const).filter((l) => l !== language);
                  return (
                    <>
                      <button
                        data-testid="lang-dropdown-trigger"
                        onClick={() => { playPop(); setLangOpen((o) => !o); }}
                        className="flex items-center gap-1 bg-white/90 border-2 border-slate-300 rounded-full px-3 py-1.5 text-base shadow-sm cursor-pointer outline-none hover:bg-slate-50 transition-all"
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
                onClick={() => {
                  playPop();
                  setShowParentGate(true);
                }}
                className="bg-white/90 border-2 border-slate-300 rounded-full px-4 py-2 text-sm font-extrabold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm outline-none"
              >
                ⚙️ {t.menu.parents}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto px-4 pb-6">
        {currentScreen === 'menu' ? (
          <div className="flex-1 flex flex-col justify-between max-w-md mx-auto w-full py-6 select-none">
            {/* Title Block */}
            <div className="text-center space-y-2 mt-4">
              <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-candy-pink via-candy-blue to-candy-purple drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] animate-pulse">
                tensaiasobi 🎮
              </h1>
              <p className="text-slate-400 font-extrabold text-base">{t.menu.subtitle}</p>
            </div>

            {/* Launchers Grid */}
            <div className="grid grid-cols-3 gap-4 my-8">
              {(!challengeActive || challengeAllowedGames.math) && (
                <KidButton
                  color="blue"
                  size="lg"
                  data-testid="launch-math"
                  onClick={() => handleScreenChange('math')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🎈</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.math}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.odd) && (
                <KidButton
                  color="yellow"
                  size="lg"
                  data-testid="launch-odd"
                  onClick={() => handleScreenChange('odd')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🧐</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.odd}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.doodle) && (
                <KidButton
                  color="pink"
                  size="lg"
                  data-testid="launch-doodle"
                  onClick={() => handleScreenChange('doodle')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🎨</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.doodle}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.memory) && (
                <KidButton
                  color="orange"
                  size="lg"
                  data-testid="launch-memory"
                  onClick={() => handleScreenChange('memory')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🐯</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.match}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.maze) && (
                <KidButton
                  color="green"
                  size="lg"
                  data-testid="launch-maze"
                  onClick={() => handleScreenChange('maze')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🗺️</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.maze}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.trace) && (
                <KidButton
                  color="purple"
                  size="lg"
                  data-testid="launch-trace"
                  onClick={() => handleScreenChange('trace')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">⭐</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.trace}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.emojiMatch) && (
                <KidButton
                  color="pink"
                  size="lg"
                  data-testid="launch-emojimatch"
                  onClick={() => handleScreenChange('emojiMatch')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">⚡</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.dobble}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.anlaut) && (
                <KidButton
                  color="red"
                  size="lg"
                  data-testid="launch-anlaut"
                  onClick={() => handleScreenChange('anlaut')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🔤</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.anlaut}</span>
                </KidButton>
              )}

              {(!challengeActive || challengeAllowedGames.shiritori) && (
                <KidButton
                  color="purple"
                  size="lg"
                  data-testid="launch-shiritori"
                  onClick={() => handleScreenChange('shiritori')}
                  className="aspect-square flex-col gap-2 rounded-[2rem]"
                >
                  <span className="text-5xl">🔗</span>
                  <span className="text-lg font-black block leading-tight">{t.menu.shiritori}</span>
                </KidButton>
              )}
            </div>

            {/* Gamification section separated by a gap and border */}
            {!challengeActive && (
              <div className="border-t-2 border-slate-200/60 pt-6 mt-2 mb-4">
                <div className="grid grid-cols-3 gap-4">
                  <KidButton
                    color="green"
                    size="lg"
                    data-testid="launch-town"
                    onClick={() => handleScreenChange('town')}
                    className="col-span-2 flex-row gap-4 rounded-[2rem] min-h-24"
                  >
                    <span className="text-5xl">🏘️</span>
                    <span className="text-lg font-black block leading-tight">{t.menu.town}</span>
                  </KidButton>

                  <KidButton
                    color="yellow"
                    size="lg"
                    data-testid="launch-shop"
                    onClick={() => handleScreenChange('shop')}
                    className="aspect-square flex-col gap-2 rounded-[2rem]"
                  >
                    <span className="text-4xl">🛒</span>
                    <span className="text-base font-black block leading-tight">{t.menu.shop}</span>
                  </KidButton>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-slate-300 font-bold">
              {t.menu.footer}
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
            setCurrentScreen('settings');
          }}
          onClose={() => setShowParentGate(false)}
        />
      )}

      {/* Parent Gate for Voucher Redemption */}
      {pendingVoucherRedeemId && (
        <ParentGate
          onSuccess={() => {
            const success = redeemVoucher(pendingVoucherRedeemId, spendStars);
            if (success) {
              playSuccess();
            } else {
              playError();
            }
            setPendingVoucherRedeemId(null);
          }}
          onClose={() => setPendingVoucherRedeemId(null)}
        />
      )}

      {/* Challenge Unlocked Celebration Overlay */}
      {challengeActive && challengeStarsRemaining === 0 && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center p-6 select-none animate-in fade-in duration-300" data-testid="challenge-completion-modal">
          <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={200} />
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

            <KidButton
              color="green"
              size="lg"
              data-testid="claim-challenge-reward-button"
              onClick={() => {
                playSuccess();
                addStars(challengeStarsTarget);
                claimChallengeReward();
                setCurrentScreen('menu');
              }}
              className="w-full rounded-2xl tracking-wider uppercase"
            >
              {t.challenge.claimStars.replace('{count}', challengeStarsTarget.toString())}
            </KidButton>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;
