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
import { useRoundTally } from '../hooks/useRoundTally';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { useLater } from '../hooks/useLater';


export function MathGame() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode, ageBand = 'little' } = useGameFX();
  const tallyRound = useRoundTally();
  // Math Pop has its own ladder per age: both ages start on 1 star, nothing locked.
  const [level, setLevel] = useAgeDifficulty('easy');
  const [question, setQuestion] = useState<MathQuestion>(() => generateQuestion(level, ageBand));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  // Preschool: fruit only on easy, fruit + numbers on medium, and on hard the
  // fruit comes back after a miss. School: only × shows fruit, in rows (medium).
  const [missed, setMissed] = useState(false);
  const { t } = useTranslation();
  // Pending "next question" timers; dropped whenever a new question loads so a
  // level change can't be overwritten by a question from the old level.
  const { later, cancelAll } = useLater();

  const { streak, highScore, registerCorrect, resetStreak } = useStreak('math');

  const loadNewQuestion = (currentLevel: GameDifficulty) => {
    cancelAll();
    // Easy has only ~10 sums; never hand back the one the child just saw.
    setQuestion((prev) => freshRound(() => generateQuestion(currentLevel, ageBand), prev, (q) => `${q.num1}${q.operator}${q.num2}`));
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
      tallyRound();

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

  // Three-digit sums (school hard, up to 100) step down one size so they fit a phone.
  const numClass = Math.max(question.num1, question.num2, question.answer) >= 100 ? 'text-5xl md:text-8xl' : 'text-6xl md:text-8xl';
  const preschool = ageBand === 'little';
  const fruitOnly = preschool && level === 'easy';
  const showPictures = preschool && (level !== 'hard' || (missed && question.num1 <= 10 && question.num2 <= 10));
  const showRows = !preschool && level === 'medium' && question.operator === '×';

  // Up to 10 fruit per group: a 3-wide grid keeps both groups side by side on a phone.
  const fruitGroup = (count: number, leaving: boolean, size = 'text-3xl sm:text-4xl') => (
    <div className={`shrink-0 grid gap-1 ${size} leading-none ${count > 2 ? 'grid-cols-3' : count === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
          locked={null}
        />

        {/* Equation */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[140px]">
          <h2 className="sr-only">{t.mathGame.title}</h2>
          {showPictures && !fruitOnly && (
            <div
              data-testid="math-pictures"
              className="flex items-center justify-center gap-3 animate-pop-in"
            >
              {fruitGroup(question.num1, false)}
              <NotebookOperator op={question.operator} />
              {fruitGroup(question.num2, question.operator === '-')}
            </div>
          )}
          {showRows && (
            <div
              data-testid="math-fruit-rows"
              className="flex flex-col gap-1 text-2xl sm:text-3xl leading-none animate-pop-in"
            >
              {Array.from({ length: question.num1 }, (_, row) => (
                <div key={row} className="flex gap-1 justify-center">
                  {Array.from({ length: question.num2 }, (_, col) => <span key={col}>{question.emoji}</span>)}
                </div>
              ))}
            </div>
          )}
          <div
            data-testid="math-equation"
            data-num1={question.num1}
            data-num2={question.num2}
            data-answer={question.answer}
            role={fruitOnly ? 'img' : undefined}
            aria-label={fruitOnly ? `${question.num1} + ${question.num2} = ?` : undefined}
            className={`flex items-center justify-center gap-2 md:gap-4 font-black tracking-tight tabular-nums text-ink ${fruitOnly ? 'flex-wrap' : ''}`}
          >
            {fruitOnly ? (
              // Two fruit groups fill a phone row, so "= ?" wraps to the line below.
              <div data-testid="math-pictures" className="basis-full flex items-center justify-center gap-3 tracking-normal animate-pop-in">
                {fruitGroup(question.num1, false, 'text-2xl sm:text-4xl')}
                <NotebookOperator op={question.operator} />
                {fruitGroup(question.num2, false, 'text-2xl sm:text-4xl')}
              </div>
            ) : (
              <>
                <span className={numClass}>{question.num1}</span>
                <NotebookOperator op={question.operator} />
                <span className={numClass}>{question.num2}</span>
              </>
            )}
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
