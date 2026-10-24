import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import AnswerBubble from '../components/AnswerBubble';
import { useTranslation } from '../hooks/useTranslation';
import { useChoiceRound } from '../hooks/useChoiceRound';
import { LETTER_PAIRS_STARS, generateLetterPairsRound } from './letterPairsLogic';
import type { GameDifficulty } from '../types/game';
import { INK, hardShadow } from '../theme/blockTable';

/** Romaji runs up to three letters (shi, tsu); keep it inside the bubble. */
function optionSize(option: string): string {
  return option.length >= 3 ? 'text-3xl' : option.length === 2 ? 'text-4xl' : 'text-5xl';
}

export default function LetterPairs() {
  const { language, t } = useTranslation();
  const { level, round, roundNo, solved, wrong, changeLevel, choose } = useChoiceRound(
    (lvl: GameDifficulty) => generateLetterPairsRound(lvl, language),
    LETTER_PAIRS_STARS,
    (r) => r.prompt,
  );

  const subtitle =
    level === 'easy' ? t.letterPairs.subtitleEasy : level === 'medium' ? t.letterPairs.subtitleMedium : t.letterPairs.subtitleHard;

  return (
    <div className="flex-1 flex flex-col items-center gap-4 p-4 w-full select-none max-w-lg mx-auto">
      {solved && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.letterPairs.title}</h2>
        <p data-testid="letter-pairs-subtitle" className="text-slate-500 font-extrabold text-sm">{subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div
          key={roundNo}
          data-testid="letter-pairs-prompt"
          data-answer={round.answer}
          className="w-40 h-40 flex items-center justify-center rounded-[2.5rem] border-[3px] bg-white text-8xl font-black text-ink animate-pop-in"
          style={{ borderColor: INK, boxShadow: hardShadow() }}
        >
          {round.prompt}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 w-full max-w-sm pb-2">
        {round.options.map((option) => (
          <AnswerBubble
            key={`${roundNo}-${option}`}
            selected={(solved && option === round.answer) || wrong === option}
            correct={solved && option === round.answer ? true : wrong === option ? false : null}
            disabled={solved}
            onClick={() => choose(option, option === round.answer)}
            testId="letter-pairs-option"
            dataAttrs={{ 'data-value': option }}
          >
            <span className={`font-black ${optionSize(option)}`}>{option}</span>
          </AnswerBubble>
        ))}
      </div>

      <p className="text-slate-400 font-extrabold text-xs text-center">{t.letterPairs.help}</p>
    </div>
  );
}
