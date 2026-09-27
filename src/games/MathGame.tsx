import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import StreakBadge from '../components/StreakBadge';
import type { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { useStreak } from '../hooks/useStreak';
import { shuffle } from '../utils/shuffle';
import { starMultiplier, wrongMeansNewRound } from '../utils/difficulty';
import { NotebookChoice, NotebookOperator, NotebookSheet, type NotebookChoiceState } from '../components/Notebook';
import { useGameFX } from '../hooks/gameFXContext';


interface Question {
  num1: number;
  num2: number;
  operator: string;
  answer: number;
  options: number[];
}


const generateQuestion = (currentLevel: GameDifficulty): Question => {
  let num1: number;
  let num2: number;
  let operator: string;
  let answer: number;

    if (currentLevel === 'easy') {
      num1 = Math.floor(Math.random() * 9) + 1;
      num2 = Math.floor(Math.random() * 9) + 1;
      operator = '+';
      answer = num1 + num2;
    } else if (currentLevel === 'medium') {
      num1 = Math.floor(Math.random() * 9) + 1;
      num2 = Math.floor(Math.random() * 9) + 1;
      if (Math.random() > 0.5) {
        operator = '+';
        answer = num1 + num2;
      } else {
        operator = '-';
        if (num1 < num2) {
          const temp = num1;
          num1 = num2;
          num2 = temp;
        }
        answer = num1 - num2;
      }
    } else if (currentLevel === 'hard') {
      num1 = Math.floor(Math.random() * 90) + 10;
      num2 = Math.floor(Math.random() * 90) + 10;
      if (Math.random() > 0.5) {
        operator = '+';
        answer = num1 + num2;
      } else {
        operator = '-';
        if (num1 < num2) {
          const temp = num1;
          num1 = num2;
          num2 = temp;
        }
        answer = num1 - num2;
      }
    } else {
      // Hard: Multiplication & Division
      if (Math.random() > 0.5) {
        num1 = Math.floor(Math.random() * 8) + 2; // 2-9
        num2 = Math.floor(Math.random() * 6) + 2; // 2-7
        operator = '×';
        answer = num1 * num2;
      } else {
        num2 = Math.floor(Math.random() * 7) + 2; // 2-8
        answer = Math.floor(Math.random() * 6) + 2; // 2-7
        num1 = num2 * answer;
        operator = '÷';
      }
    }

    const optionsSet = new Set<number>();
    optionsSet.add(answer);

    while (optionsSet.size < 3) {
      const offset = Math.floor(Math.random() * 9) - 4; // -4 to +4
      const wrong = answer + offset;
      if (wrong !== answer && wrong >= 0 && wrong <= 200) {
        optionsSet.add(wrong);
      }
    }

    const options = shuffle(Array.from(optionsSet));

    return {
      num1,
      num2,
      operator,
      answer,
      options,
    };
  };

export function MathGame() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const [level, setLevel] = useState<GameDifficulty>('easy');
  const [question, setQuestion] = useState<Question>(() => generateQuestion('easy'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { t } = useTranslation();

  const { streak, highScore, registerCorrect, resetStreak } = useStreak('math');

  const loadNewQuestion = (currentLevel: GameDifficulty) => {
    setQuestion(generateQuestion(currentLevel));
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  const handleAnswerSelect = (opt: number) => {
    if (selectedAnswer !== null) return; // Prevent multiple selection before next question

    setSelectedAnswer(opt);
    if (question && opt === question.answer) {
      setIsCorrect(true);
      setShowConfetti(true);
      playSuccess();
      
      registerCorrect();

      // Award stars: base 2 × level multiplier
      const multiplier = starMultiplier(level);
      onStarEarned?.(2 * multiplier);

      setTimeout(() => {
        setShowConfetti(false);
        loadNewQuestion(level);
      }, 1800);
    } else {
      setIsCorrect(false);
      playError();
      resetStreak();

      if (wrongMeansNewRound(level, challengeMode)) {
        setTimeout(() => {
          loadNewQuestion(level);
        }, 1500);
      } else {
        setTimeout(() => {
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

  // Two-digit sums (hard) need a smaller size so "88 − 88 = ?" fits a phone row.
  const numClass = level === 'hard' ? 'text-5xl md:text-7xl' : 'text-6xl md:text-8xl';

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
