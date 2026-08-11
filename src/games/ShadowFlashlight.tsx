import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import { shuffle } from '../utils/shuffle';
import { starMultiplier } from '../utils/difficulty';
import type { GameDifficulty, GameProps } from '../types/game';

interface ShadowItem {
  emoji: string;
  name: string;
}

interface DifficultyConfig {
  choices: number;
  radius: number;
  baseStars: number;
}

const SHADOW_ITEMS: ShadowItem[] = [
  { emoji: '🐱', name: 'cat' },
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐰', name: 'rabbit' },
  { emoji: '🐻', name: 'bear' },
  { emoji: '🐼', name: 'panda' },
  { emoji: '🦊', name: 'fox' },
  { emoji: '🦁', name: 'lion' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🐷', name: 'pig' },
  { emoji: '🐮', name: 'cow' },
  { emoji: '🍎', name: 'apple' },
  { emoji: '🍌', name: 'banana' },
  { emoji: '🍇', name: 'grapes' },
  { emoji: '🍉', name: 'watermelon' },
  { emoji: '🍓', name: 'strawberry' },
  { emoji: '🍍', name: 'pineapple' },
  { emoji: '🚗', name: 'car' },
  { emoji: '🚲', name: 'bicycle' },
  { emoji: '✈️', name: 'airplane' },
  { emoji: '🚀', name: 'rocket' },
  { emoji: '⭐', name: 'star' },
  { emoji: '🌙', name: 'moon' },
  { emoji: '☀️', name: 'sun' },
  { emoji: '☁️', name: 'cloud' },
  { emoji: '❤️', name: 'heart' },
];

const DIFFICULTY_CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: { choices: 3, radius: 64, baseStars: 2 },
  medium: { choices: 5, radius: 48, baseStars: 2 },
  hard: { choices: 6, radius: 36, baseStars: 2 },
};

type ShadowFlashlightProps = GameProps;

function generateRound(difficulty: GameDifficulty): { target: ShadowItem; choices: ShadowItem[] } {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pool = shuffle([...SHADOW_ITEMS]);
  const target = pool[0];
  const distractors = pool.slice(1, config.choices);
  const choices = shuffle([target, ...distractors]);
  return { target, choices };
}

export function ShadowFlashlight({
  playPop,
  playSuccess,
  playError,
  onStarEarned,
}: ShadowFlashlightProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [target, setTarget] = useState<ShadowItem | null>(null);
  const [choices, setChoices] = useState<ShadowItem[]>([]);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isRevealed, setIsRevealed] = useState(false);
  const [shakeChoice, setShakeChoice] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const config = DIFFICULTY_CONFIG[difficulty];

  const initRound = useCallback(() => {
    const round = generateRound(difficulty);
    setTarget(round.target);
    setChoices(round.choices);
    setIsRevealed(false);
    setShakeChoice(null);
    setShowConfetti(false);
  }, [difficulty]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initRound();
  }, [initRound]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPosition({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      });
    },
    []
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isRevealed) return;
    handlePointerMove(e);
  };

  const handlePointerUp = () => {};

  const handleChoice = (item: ShadowItem) => {
    if (isRevealed || !target) return;

    if (item.emoji === target.emoji) {
      setIsRevealed(true);
      setShowConfetti(true);
      playSuccess();
      onStarEarned?.(config.baseStars * starMultiplier(difficulty));
    } else {
      playError();
      setShakeChoice(item.emoji);
      setTimeout(() => setShakeChoice((prev) => (prev === item.emoji ? null : prev)), 400);
    }
  };

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const maskStyle = useMemo(() => {
    return {
      WebkitMaskImage: `radial-gradient(circle ${config.radius}px at ${position.x}% ${position.y}%, black 100%, transparent 100%)`,
      maskImage: `radial-gradient(circle ${config.radius}px at ${position.x}% ${position.y}%, black 100%, transparent 100%)`,
    };
  }, [config.radius, position.x, position.y]);

  const flashlightStyle = useMemo(() => {
    return {
      left: `${position.x}%`,
      top: `${position.y}%`,
      width: config.radius * 2,
      height: config.radius * 2,
      marginLeft: -config.radius,
      marginTop: -config.radius,
    };
  }, [config.radius, position.x, position.y]);

  if (!target) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full">
      {showConfetti && <GameConfetti pieces={150} />}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={isRevealed}
          className="!w-auto flex-1 max-w-[220px]"
        />
      </div>

      {/* Title */}
      <div className="text-center space-y-1 mt-3 shrink-0">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.shadowFlashlight.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.shadowFlashlight.subtitle}</p>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center my-4 w-full h-full min-h-[280px]">
        <div
          ref={stageRef}
          data-testid="shadow-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative w-full h-full max-h-[420px] rounded-[2.5rem] border-8 border-slate-800 bg-slate-950 overflow-hidden shadow-inner cursor-none touch-none"
        >
          {/* Hidden object layer */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden={!isRevealed}
          >
            <span className="text-[10rem] leading-none drop-shadow-[0_4px_8px_rgba(255,255,255,0.3)] animate-emoji-pop">
              {target.emoji}
            </span>
          </div>

          {/* Revealed silhouette inside flashlight beam: white light showing only the emoji's black outline */}
          {!isRevealed && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none bg-white"
              style={maskStyle}
            >
              <div className="relative flex items-center justify-center">
                {/* Outline layer: black silhouette slightly enlarged forms the outline ring */}
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10rem] leading-none"
                  style={{
                    filter: 'brightness(0)',
                    transform: 'scale(1.06)',
                  }}
                  aria-hidden="true"
                >
                  {target.emoji}
                </span>
                {/* Fill layer: white silhouette at normal scale erases the interior, leaving only the outline visible */}
                <span
                  className="relative text-[10rem] leading-none"
                  style={{
                    filter: 'brightness(0) invert(1)',
                  }}
                >
                  {target.emoji}
                </span>
              </div>
            </div>
          )}

          {/* Flashlight rim */}
          {!isRevealed && (
            <div
              className="absolute rounded-full border-4 border-white/70 shadow-[0_0_24px_8px_rgba(255,255,255,0.45)] pointer-events-none"
              style={flashlightStyle}
            />
          )}

          {/* Victory overlay */}
          {isRevealed && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-4 z-20 animate-in fade-in duration-300">
              <span className="text-6xl animate-bounce">🔦✨</span>
              <h3 className="text-3xl font-black text-white text-center leading-tight">
                {t.shadowFlashlight.victory}
              </h3>
              <KidButton
                color="green"
                size="lg"
                data-testid="shadow-play-again"
                onClick={() => { playPop(); initRound(); }}
                className="rounded-2xl tracking-wider uppercase"
              >
                🔄 {t.common.next}
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Answer choices */}
      <div className="w-full shrink-0">
        <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
          {choices.map((item, idx) => {
            const isShaking = shakeChoice === item.emoji;
            return (
              <button
                key={`${item.emoji}-${idx}`}
                data-testid="shadow-choice"
                disabled={isRevealed}
                onClick={() => handleChoice(item)}
                className={`
                  aspect-square rounded-[2rem] border-4 bg-white border-slate-200 shadow-[0_6px_0_0_#cbd5e1]
                  flex items-center justify-center text-5xl transition-all duration-75
                  active:translate-y-[4px] active:shadow-[0_2px_0_0_#cbd5e1]
                  disabled:opacity-60 disabled:cursor-not-allowed outline-none cursor-pointer select-none
                  ${isShaking ? 'animate-shake bg-red-100 border-red-300' : 'hover:bg-slate-50'}
                `}
              >
                <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">{item.emoji}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Help */}
      <div className="text-center font-extrabold text-xs pb-2 pt-2 shrink-0 text-slate-400">
        {t.shadowFlashlight.help}
      </div>
    </div>
  );
}

export default ShadowFlashlight;
