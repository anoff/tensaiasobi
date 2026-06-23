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
import { I18nProvider, useTranslation } from './hooks/useTranslation';

// Gamification imports
import { StarCounter } from './components/StarCounter';
import { StarShop } from './components/StarShop';
import { TownBuilder } from './games/TownBuilder';
import { useStars } from './hooks/useStars';
import { useVouchers } from './hooks/useVouchers';

type Screen = 'menu' | 'math' | 'odd' | 'doodle' | 'memory' | 'maze' | 'trace' | 'anlaut' | 'town' | 'shop' | 'settings';

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
    
    // Clear gamification progress
    resetStars();
    resetVouchers();
    localStorage.removeItem('gamification_town');
    
    playSuccess();
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'math':
        return <MathGame playPop={playPop} playSuccess={playSuccess} playError={playError} onStarEarned={(amt) => addStars(amt)} />;
      case 'odd':
        return <OddOneOut playPop={playPop} playSuccess={playSuccess} playError={playError} onStarEarned={(amt) => addStars(amt)} />;
      case 'doodle':
        return <DoodlePad playPop={playPop} />;
      case 'memory':
        return <MemoryMatch playPop={playPop} playSuccess={playSuccess} playError={playError} onStarEarned={(amt) => addStars(amt)} />;
      case 'maze':
        return <MazeGame playPop={playPop} playSuccess={playSuccess} playError={playError} onStarEarned={(amt) => addStars(amt)} />;
      case 'trace':
        return <ShapeTrace playPop={playPop} playSuccess={playSuccess} playError={playError} onStarEarned={(amt) => addStars(amt)} />;
      case 'anlaut':
        return <AnlautGame playPop={playPop} playSuccess={playSuccess} playError={playError} onStarEarned={(amt) => addStars(amt)} />;
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

              <KidButton
                color="red"
                size="lg"
                data-testid="launch-anlaut"
                onClick={() => handleScreenChange('anlaut')}
                className="col-span-3 flex-row gap-4 rounded-[2rem] min-h-24"
              >
                <span className="text-5xl">🔤</span>
                <span className="text-lg font-black block leading-tight">{t.menu.anlaut}</span>
              </KidButton>

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
                className="col-span-1 flex-col gap-2 rounded-[2rem]"
              >
                <span className="text-4xl">🛒</span>
                <span className="text-base font-black block leading-tight">{t.menu.shop}</span>
              </KidButton>
            </div>

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
