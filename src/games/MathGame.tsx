import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import StreakBadge from '../components/StreakBadge';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { useStreak } from '../hooks/useStreak';
import { shuffle } from '../utils/shuffle';
import { starMultiplier } from '../utils/difficulty';
import AnswerBubble from '../components/AnswerBubble';



interface Question {
  text: string;
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
      text: `${num1} ${operator} ${num2}`,
      answer,
      options,
    };
  };

export function MathGame({ playPop, playSuccess, playError, onStarEarned, challengeMode }: GameProps) {
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

      if (challengeMode) {
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

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      {/* Level Selection Tabs */}
      <DifficultySelector
        selected={level}
        options={['easy', 'medium', 'hard']}
        onChange={handleLevelChange}
      />

      {/* Equation Panel */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 space-y-4">
        <div className="text-sm font-black tracking-widest text-slate-400 uppercase text-center">
          {t.mathGame.title}
        </div>
        <div data-testid="math-equation" className="text-7xl md:text-8xl font-black text-slate-800 tracking-tight select-none">
          {question?.text}
        </div>
        
        {/* Streak Counter */}
        <StreakBadge streak={streak} highScore={highScore} />
      </div>

      {/* Answer Bubbles */}
      <div className="w-full flex flex-col items-center gap-6 pb-4">
        <div className="w-full grid grid-cols-3 gap-4 max-w-sm">
          {question?.options.map((opt) => {
            const isThisSelected = selectedAnswer === opt;

            return (
              <AnswerBubble
                key={opt}
                selected={isThisSelected}
                correct={isCorrect}
                disabled={selectedAnswer !== null}
                onClick={() => handleAnswerSelect(opt)}
                testId="math-answer-option"
                className="text-4xl md:text-5xl font-black text-white"
              >
                {opt}
              </AnswerBubble>
            );
          })}
        </div>
        <div className="text-slate-400 font-extrabold text-xs text-center">
          {t.mathGame.help}
        </div>
      </div>
    </div>
  );
}

export default MathGame;
