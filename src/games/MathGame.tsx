import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import KidButton from '../components/KidButton';

type Level = 'easy' | 'medium' | 'hard' | 'expert';

interface Question {
  text: string;
  answer: number;
  options: number[];
}

interface MathGameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
}

export function MathGame({ playPop, playSuccess, playError }: MathGameProps) {
  const [level, setLevel] = useState<Level>('easy');
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('math_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('math_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const generateQuestion = (currentLevel: Level): Question => {
    let num1 = 0;
    let num2 = 0;
    let operator = '+';
    let answer = 0;

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
      // Expert: Multiplication & Division
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

    const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

    return {
      text: `${num1} ${operator} ${num2}`,
      answer,
      options,
    };
  };

  const loadNewQuestion = (currentLevel: Level) => {
    setQuestion(generateQuestion(currentLevel));
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  useEffect(() => {
    loadNewQuestion(level);
  }, [level]);

  const handleAnswerSelect = (opt: number) => {
    if (selectedAnswer !== null) return; // Prevent multiple selection before next question

    setSelectedAnswer(opt);
    if (question && opt === question.answer) {
      setIsCorrect(true);
      setShowConfetti(true);
      playSuccess();
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('math_streak', newStreak.toString());

      if (newStreak > highScore) {
        setHighScore(newStreak);
        localStorage.setItem('math_highscore', newStreak.toString());
      }

      setTimeout(() => {
        setShowConfetti(false);
        loadNewQuestion(level);
      }, 1800);
    } else {
      setIsCorrect(false);
      playError();
      setStreak(0);
      localStorage.setItem('math_streak', '0');

      setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 1000);
    }
  };

  const handleLevelChange = (newLevel: Level) => {
    playPop();
    setLevel(newLevel);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={150}
          recycle={false}
        />
      )}

      {/* Level Selection Tabs */}
      <div className="w-full flex justify-between bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 gap-1.5">
        {(['easy', 'medium', 'hard', 'expert'] as Level[]).map((lvl) => (
          <button
            key={lvl}
            onClick={() => handleLevelChange(lvl)}
            className={`
              flex-1 py-2 text-sm font-black rounded-xl capitalize border-b-4 transition-all duration-75 outline-none
              ${
                level === lvl
                  ? 'bg-candy-purple text-white border-purple-700 shadow-sm translate-y-[2px]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Equation Panel */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 space-y-4">
        <div className="text-sm font-black tracking-widest text-slate-400 uppercase">
          Solve the Equation!
        </div>
        <div className="text-7xl md:text-8xl font-black text-slate-800 tracking-tight select-none">
          {question?.text}
        </div>
        
        {/* Streak Counter */}
        <div className="flex gap-4 items-center justify-center pt-2">
          <span className="bg-amber-100 text-amber-600 font-extrabold px-4 py-1.5 rounded-full border-2 border-amber-300 text-sm shadow-sm flex items-center gap-1.5 animate-pulse">
            🔥 Streak: {streak}
          </span>
          <span className="bg-indigo-100 text-indigo-600 font-extrabold px-4 py-1.5 rounded-full border-2 border-indigo-300 text-sm shadow-sm">
            🏆 High: {highScore}
          </span>
        </div>
      </div>

      {/* Answer Bubbles */}
      <div className="w-full flex flex-col items-center gap-6 pb-4">
        <div className="w-full grid grid-cols-3 gap-4 max-w-sm">
          {question?.options.map((opt) => {
            const isThisSelected = selectedAnswer === opt;
            const isThisCorrect = opt === question.answer;

            let bubbleColorClass =
              'from-sky-300/40 via-sky-400/70 to-sky-600/90 shadow-[0_10px_20px_rgba(14,165,233,0.3),_inset_0_4px_12px_rgba(255,255,255,0.6)] border-sky-400';
            
            if (isThisSelected) {
              if (isCorrect === true) {
                bubbleColorClass =
                  'from-emerald-300 via-emerald-400 to-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.4)] border-emerald-400 scale-95 duration-100';
              } else if (isCorrect === false) {
                bubbleColorClass =
                  'from-red-300 via-red-400 to-red-600 shadow-[0_4px_10px_rgba(239,68,68,0.4)] border-red-400 animate-shake scale-95 duration-100';
              }
            }

            return (
              <button
                key={opt}
                disabled={selectedAnswer !== null}
                onClick={() => handleAnswerSelect(opt)}
                className={`
                  relative w-full aspect-square rounded-full flex items-center justify-center
                  text-4xl md:text-5xl font-black text-white border-4 transition-all duration-150
                  bg-gradient-to-br hover:scale-105 active:scale-95 outline-none cursor-pointer
                  ${bubbleColorClass}
                `}
              >
                {/* Bubble reflection effect */}
                <div className="absolute top-3 left-4 w-1/4 h-1/8 bg-white/60 rounded-full -rotate-12 pointer-events-none" />
                <div className="absolute bottom-2 right-4 w-1/8 h-1/8 bg-white/20 rounded-full pointer-events-none" />
                
                {opt}
              </button>
            );
          })}
        </div>
        <div className="text-slate-400 font-extrabold text-xs">
          Tap the correct bubble!
        </div>
      </div>
    </div>
  );
}

export default MathGame;
