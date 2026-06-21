import React, { useState } from 'react';
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

type Screen = 'menu' | 'math' | 'odd' | 'doodle' | 'memory' | 'settings';

function App() {
  const [soundEnabled, setSoundEnabled] = useLocalStorage<boolean>('settings_sound_enabled', true);
  const [vibrationEnabled, setVibrationEnabled] = useLocalStorage<boolean>('settings_vibration_enabled', true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [showParentGate, setShowParentGate] = useState(false);

  const { playPop, playSuccess, playError } = useSound(soundEnabled, vibrationEnabled);

  const handleScreenChange = (screen: Screen) => {
    playPop();
    setCurrentScreen(screen);
  };

  const handleClearProgress = () => {
    localStorage.removeItem('math_streak');
    localStorage.removeItem('math_highscore');
    localStorage.removeItem('odd_streak');
    localStorage.removeItem('odd_highscore');
    playSuccess();
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'math':
        return <MathGame playPop={playPop} playSuccess={playSuccess} playError={playError} />;
      case 'odd':
        return <OddOneOut playPop={playPop} playSuccess={playSuccess} playError={playError} />;
      case 'doodle':
        return <DoodlePad playPop={playPop} />;
      case 'memory':
        return <MemoryMatch playPop={playPop} playSuccess={playSuccess} playError={playError} />;
      case 'settings':
        return (
          <ParentDashboard
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            vibrationEnabled={vibrationEnabled}
            setVibrationEnabled={setVibrationEnabled}
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
            <HomeButton onClick={() => handleScreenChange('menu')} />
          )}
        </div>
        
        {currentScreen === 'menu' && (
          <button
            onClick={() => {
              playPop();
              setShowParentGate(true);
            }}
            className="bg-white/90 border-2 border-slate-300 rounded-full px-4 py-2 text-sm font-extrabold text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm outline-none"
          >
            ⚙️ Parents
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto px-4 pb-6">
        {currentScreen === 'menu' ? (
          <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full py-6 select-none">
            {/* Title Block */}
            <div className="text-center space-y-2 mt-4">
              <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-candy-pink via-candy-blue to-candy-purple drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)] animate-pulse">
                tensaiasobi 🎮
              </h1>
              <p className="text-slate-400 font-extrabold text-base">Fun play & learn games!</p>
            </div>

            {/* Launchers Grid */}
            <div className="grid grid-cols-2 gap-4 my-8">
              <KidButton
                color="blue"
                size="lg"
                onClick={() => handleScreenChange('math')}
                className="aspect-square flex-col gap-2 rounded-[2rem]"
              >
                <span className="text-5xl">🎈</span>
                <span className="text-lg font-black block leading-tight">Math Pop</span>
              </KidButton>

              <KidButton
                color="yellow"
                size="lg"
                onClick={() => handleScreenChange('odd')}
                className="aspect-square flex-col gap-2 rounded-[2rem]"
              >
                <span className="text-5xl">🧐</span>
                <span className="text-lg font-black block leading-tight">Odd One</span>
              </KidButton>

              <KidButton
                color="pink"
                size="lg"
                onClick={() => handleScreenChange('doodle')}
                className="aspect-square flex-col gap-2 rounded-[2rem]"
              >
                <span className="text-5xl">🎨</span>
                <span className="text-lg font-black block leading-tight">Doodle</span>
              </KidButton>

              <KidButton
                color="orange"
                size="lg"
                onClick={() => handleScreenChange('memory')}
                className="aspect-square flex-col gap-2 rounded-[2rem]"
              >
                <span className="text-5xl">🐯</span>
                <span className="text-lg font-black block leading-tight">Match</span>
              </KidButton>
            </div>

            <div className="text-center text-xs text-slate-300 font-bold">
              Made with ❤️ for learning
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
    </div>
  );
}

export default App;
