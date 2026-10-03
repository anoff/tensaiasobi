import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import StreakBadge from '../components/StreakBadge';
import type { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { useStreak } from '../hooks/useStreak';
import { CHOICE_STARS, wrongMeansNewRound } from '../utils/difficulty';
import { freshRound } from '../utils/freshRound';
import { NotebookChoice, NotebookOperator, NotebookSheet, NotebookTally, type NotebookChoiceState } from '../components/Notebook';
import { generateMathQuestion as generateQuestion, type MathQuestion } from './mathPopLogic';
import { useGameFX } from '../hooks/gameFXContext';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { useLater } from '../hooks/useLater';


export function MathGame() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const [level, setLevel] = useAgeDifficulty();
  const [question, setQuestion] = useState<MathQuestion>(() => generateQuestion(level));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  // Fruit pictures + dot tallies are the counting crutch: always on easy,
  // on medium only after a miss, never on hard.
  const [missed, setMissed] = useState(false);
  const { t } = useTranslation();
  // Pending "next question" timers; dropped whenever a new question loads so a
  // level change can't be overwritten by a question from the old level.
  const { later, cancelAll } = useLater();

  const { streak, highScore, registerCorrect, resetStreak } = useStreak('math');

  const loadNewQuestion = (currentLevel: GameDifficulty) => {
    cancelAll();
    // Easy has only ~10 sums; never hand back the one the child just saw.
    setQuestion((prev) => freshRound(() => generateQuestion(currentLevel), prev, (q) => `${q.num1}${q.operator}${q.num2}`));
    setShowConfetti(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setMissed(false);
  };

  const handleAnswerSelect = (opt: number) => {
    if (selectedAnswer !== null) return; // Prevent multiple selection before next question

    setSelectedAnswer(opt);
    if (question && opt === question.answer) {
      setIsCorrect(true);
      setShowConfetti(true);
      playSuccess();
      
      registerCorrect();

      onStarEarned?.(CHOICE_STARS[level]);

      later(() => loadNewQuestion(level), 1800);
    } else {
      setIsCorrect(false);
      setMissed(true);
      playError();
      resetStreak();

      if (wrongMeansNewRound(level, challengeMode)) {
        later(() => loadNewQuestion(level), 1500);
      } else {
        later(() => {
          setSelectedAnswer(null);
          setIsCorrect(null);
        }, 1000);
      }
    }
  };

  const handleLevelChange = (newLevel: GameDifficulty) => {
    playPop();
    setLevel(newLevel);
    loadNewQuestion(newLevel);
  };

  const choiceState = (opt: number): NotebookChoiceState => {
    if (selectedAnswer !== opt) return 'idle';
    return isCorrect ? 'correct' : 'wrong';
  };

  const numClass = 'text-6xl md:text-8xl';
  const showPictures = level === 'easy' || (level === 'medium' && missed);

  // Up to 10 fruit per group: a 3-wide grid keeps both groups side by side on a phone.
  const fruitGroup = (count: number, leaving: boolean) => (
    <div className={`grid gap-1 text-3xl sm:text-4xl leading-none ${count > 2 ? 'grid-cols-3' : count === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={leaving ? 'opacity-40 grayscale-[40%]' : ''}>{question.emoji}</span>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      <NotebookSheet className="flex-1 flex flex-col gap-4 p-4 pb-5">
        {/* Level Selection Tabs */}
        <DifficultySelector
          selected={level}
          options={['easy', 'medium', 'hard']}
          onChange={handleLevelChange}
          variant="paper"
        />

        {/* Equation */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[140px]">
          <h2 className="sr-only">{t.mathGame.title}</h2>
          {showPictures && (
            <div
              data-testid="math-pictures"
              className="flex items-center justify-center gap-3 animate-pop-in"
            >
              {fruitGroup(question.num1, false)}
              <NotebookOperator op={question.operator} />
              {fruitGroup(question.num2, question.operator === '-')}
            </div>
          )}
          <div
            data-testid="math-equation"
            className="flex items-center justify-center gap-2 md:gap-4 font-black tracking-tight tabular-nums text-ink"
          >
            <span className={numClass}>{question.num1}</span>
            <NotebookOperator op={question.operator} />
            <span className={numClass}>{question.num2}</span>
            <span aria-hidden="true" className="text-4xl md:text-6xl text-ink/40">=</span>
            <span
              aria-hidden="true"
              className={`min-w-[1em] text-center ${numClass} ${isCorrect ? 'text-emerald-600' : 'text-ink/25'}`}
            >
              {isCorrect ? question.answer : '?'}
            </span>
          </div>

          {/* Streak Counter */}
          <StreakBadge streak={streak} highScore={highScore} size="sm" />
        </div>

        {/* Answer lines */}
        <div className="w-full flex flex-col gap-2">
          {question.options.map((opt) => (
            <NotebookChoice
              key={opt}
              state={choiceState(opt)}
              disabled={selectedAnswer !== null}
              onClick={() => handleAnswerSelect(opt)}
              testId="math-answer-option"
              aside={showPictures ? <NotebookTally count={opt} /> : undefined}
            >
              {opt}
            </NotebookChoice>
          ))}
        </div>
      </NotebookSheet>
    </div>
  );
}

export default MathGame;
