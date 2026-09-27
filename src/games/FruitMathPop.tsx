import { useCallback, useEffect, useRef, useState } from 'react';
import DifficultySelector from '../components/DifficultySelector';
import GameConfetti from '../components/GameConfetti';
import { NotebookChoice, NotebookOperator, NotebookSheet, NotebookTally } from '../components/Notebook';
import { useTranslation } from '../hooks/useTranslation';
import { TOWER_SORT_THEMES, type TowerSortTheme } from './towerSortThemes';
import type { GameDifficulty } from '../types/game';
import { generateFruitMathRound } from './fruitMathPopLogic';
import { useGameFX } from '../hooks/gameFXContext';
import { wrongMeansNewRound } from '../utils/difficulty';

const STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

/** The fruit pops in before the answer lines appear. */
const WATCH_MS = 600;

type Phase = 'watching' | 'choices' | 'success';

export default function FruitMathPop() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [themeIndex, setThemeIndex] = useState(1);
  const [round, setRound] = useState(() => generateFruitMathRound('easy', TOWER_SORT_THEMES[1]));
  const [roundNo, setRoundNo] = useState(0);
  const [phase, setPhase] = useState<Phase>('watching');
  // Dot tallies are a counting crutch: always on for easy; on medium they
  // appear only after a miss, so the child has to count the fruit first.
  const [tallyShown, setTallyShown] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongChoice, setWrongChoice] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  const theme = TOWER_SORT_THEMES[themeIndex];

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const startRound = useCallback((value: GameDifficulty, nextTheme: TowerSortTheme) => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setRound(generateFruitMathRound(value, nextTheme));
    setRoundNo((n) => n + 1);
    setPhase('watching');
    setTallyShown(value === 'easy');
    setSelected(null);
    setWrongChoice(null);
  }, []);

  useEffect(() => {
    const watchTimer = window.setTimeout(() => setPhase('choices'), WATCH_MS);
    return () => window.clearTimeout(watchTimer);
  }, [round]);

  const changeDifficulty = (value: GameDifficulty) => {
    playPop();
    setDifficulty(value);
    startRound(value, theme);
  };

  const handleChoice = (choice: number) => {
    if (phase !== 'choices' || selected !== null) return;
    setSelected(choice);
    if (choice === round.result) {
      setPhase('success');
      playSuccess();
      onStarEarned?.(STARS[difficulty]);
      later(() => startRound(difficulty, theme), 1200);
    } else {
      playError();
      setWrongChoice(choice);
      if (wrongMeansNewRound(difficulty, challengeMode)) {
        // Hard: no smashing through the answers — a miss brings a new sum.
        later(() => startRound(difficulty, theme), 900);
      } else {
        setTallyShown(true);
        later(() => {
          setWrongChoice(null);
          setSelected(null);
        }, 600);
      }
    }
  };

  const changeTheme = () => {
    playPop();
    const nextIndex = (themeIndex + 1) % TOWER_SORT_THEMES.length;
    setThemeIndex(nextIndex);
    startRound(difficulty, TOWER_SORT_THEMES[nextIndex]);
  };

  // Up to 10 fruit per group: a 3-wide grid keeps both groups side by side on a phone.
  const group = (count: number, leaving: boolean) => (
    <div className={`grid gap-1 text-3xl sm:text-4xl leading-none ${count > 2 ? 'grid-cols-3' : count === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={leaving ? 'opacity-40 grayscale-[40%]' : ''}>{round.emoji}</span>
      ))}
    </div>
  );

  const showChoices = phase === 'choices' || phase === 'success';

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
      <NotebookSheet className="flex-1 flex flex-col gap-3 p-4">
        <div
          data-testid="fruit-math-pop-tray"
          data-operation={round.operation}
          data-result={round.result}
          data-round={roundNo}
          className="relative flex-1 min-h-[120px] flex items-center justify-center"
        >
          <div key={roundNo} className="flex items-center justify-center gap-3 animate-pop-in">
            <div data-testid="fruit-math-pop-left">{group(round.left, false)}</div>
            <NotebookOperator op={round.operation} />
            <div data-testid="fruit-math-pop-right">{group(round.right, round.operation === '-')}</div>
          </div>
        </div>
        <div className="w-full flex flex-col justify-center gap-1.5" style={{ minHeight: `${round.choices.length * 78}px` }}>
          {showChoices ? (
            round.choices.map((choice) => (
              <NotebookChoice
                key={choice}
                testId="fruit-math-pop-answer"
                dataAttrs={{ 'data-quantity': choice.toString() }}
                state={selected === choice && choice === round.result ? 'correct' : wrongChoice === choice ? 'wrong' : 'idle'}
                disabled={phase === 'success'}
                onClick={() => handleChoice(choice)}
                aside={tallyShown ? <NotebookTally count={choice} /> : undefined}
              >
                {choice}
              </NotebookChoice>
            ))
          ) : (
            <p className="text-center font-black text-ink/50">{t.fruitMathPop.watch}</p>
          )}
        </div>
      </NotebookSheet>
    </div>
  );
}
