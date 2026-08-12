import { useCallback, useEffect, useState } from 'react';
import AnswerBubble from '../components/AnswerBubble';
import DifficultySelector from '../components/DifficultySelector';
import GameConfetti from '../components/GameConfetti';
import { useTranslation } from '../hooks/useTranslation';
import { TOWER_SORT_THEMES } from './towerSortThemes';
import type { GameDifficulty, GameProps } from '../types/game';
import { generateFruitMathRound } from './fruitMathPopLogic';

const STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

type Phase = 'animating' | 'hiding' | 'choices' | 'success';

export default function FruitMathPop({ playPop, playSuccess, playError, onStarEarned }: GameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [themeIndex, setThemeIndex] = useState(1);
  const [round, setRound] = useState(() => generateFruitMathRound('easy', TOWER_SORT_THEMES[1]));
  const [phase, setPhase] = useState<Phase>('animating');
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const theme = TOWER_SORT_THEMES[themeIndex];

  const initRound = useCallback(() => {
    setRound(generateFruitMathRound(difficulty, theme));
    setPhase('animating');
    setSelected(null);
    setWrongChoice(null);
  }, [difficulty, theme]);

  useEffect(() => {
    let hidingTimer: number | undefined;
    const animationTimer = window.setTimeout(() => {
      if (difficulty === 'hard') {
        setPhase('hiding');
        hidingTimer = window.setTimeout(() => setPhase('choices'), 450);
      } else {
        setPhase('choices');
      }
    }, 850);
    return () => {
      window.clearTimeout(animationTimer);
      if (hidingTimer !== undefined) window.clearTimeout(hidingTimer);
    };
  }, [round, difficulty]);

  const changeDifficulty = (value: GameDifficulty) => {
    playPop();
    setDifficulty(value);
    setRound(generateFruitMathRound(value, theme));
    setPhase('animating');
    setSelected(null);
    setWrongChoice(null);
  };

  const handleChoice = (choice: number) => {
    if (phase !== 'choices' || selected !== null) return;
    setSelected(choice);
    if (choice === round.result) {
      setPhase('success');
      playSuccess();
      onStarEarned?.(STARS[difficulty]);
      window.setTimeout(initRound, 950);
    } else {
      playError();
      setWrongChoice(choice);
      window.setTimeout(() => setWrongChoice(null), 450);
      window.setTimeout(() => setSelected(null), 450);
    }
  };

  const changeTheme = () => {
    playPop();
    const nextTheme = TOWER_SORT_THEMES[(themeIndex + 1) % TOWER_SORT_THEMES.length];
    setThemeIndex((index) => (index + 1) % TOWER_SORT_THEMES.length);
    setRound(generateFruitMathRound(difficulty, nextTheme));
    setPhase('animating');
    setSelected(null);
    setWrongChoice(null);
  };

  const group = (count: number) => Array.from({ length: count }, (_, index) => (
    <span key={index}>{round.emoji}</span>
  ));

  return (
    <div className={`flex-1 flex flex-col items-center gap-3 p-2 w-full max-w-lg mx-auto select-none bg-gradient-to-b ${theme.bgGradient}`}>
      {phase === 'success' && <GameConfetti pieces={120} />}
      <div className="w-full flex items-center gap-2 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          className="!w-auto flex-1"
        />
        <button
          type="button"
          aria-label={t.fruitMathPop.theme}
          onClick={changeTheme}
          className="text-3xl p-2 rounded-2xl bg-white border-2 border-slate-200"
        >
          {theme.nameEmoji}
        </button>
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-800">{t.fruitMathPop.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.fruitMathPop.subtitle}</p>
      </div>
      <div data-testid="fruit-math-pop-tray" data-operation={round.operation} data-result={round.result} className="flex-1 w-full min-h-[270px] flex flex-col items-center justify-center gap-6 rounded-[2.5rem] bg-white/60 border-8 border-white/80 shadow-inner">
        <div className="flex items-center justify-center gap-3 text-4xl sm:text-5xl font-black">
          <div data-testid="fruit-math-pop-left" className="flex gap-1 animate-bounce">{group(round.left)}</div>
          <span aria-hidden="true" className="animate-pulse">{round.operation}</span>
          <div data-testid="fruit-math-pop-right" className={`flex gap-1 ${round.operation === '+' ? 'animate-pulse' : 'animate-shake'}`}>{group(round.right)}</div>
        </div>
        <div className={`flex gap-1 text-4xl sm:text-5xl min-h-14 transition-opacity duration-300 ${phase === 'hiding' ? 'opacity-0' : 'opacity-100'} ${phase === 'success' ? 'animate-bounce' : ''}`}>
          {group(round.result)}
        </div>
      </div>
      {phase === 'choices' || phase === 'success' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full pb-2">
          {round.choices.map((choice) => (
            <AnswerBubble
              key={choice}
              testId="fruit-math-pop-answer"
              dataAttrs={{ 'data-quantity': choice.toString() }}
              selected={selected === choice}
              correct={selected === choice ? choice === round.result : null}
              shake={wrongChoice === choice}
              disabled={phase === 'success'}
              onClick={() => handleChoice(choice)}
            >
              <span className="flex flex-wrap justify-center gap-1 p-3 text-3xl">{Array.from({ length: choice }, (_, index) => <span key={index}>{round.emoji}</span>)}</span>
            </AnswerBubble>
          ))}
        </div>
      ) : (
        <p className="font-black text-slate-500 pb-4">{t.fruitMathPop.watch}</p>
      )}
    </div>
  );
}
