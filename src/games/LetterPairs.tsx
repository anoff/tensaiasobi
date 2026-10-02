import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import AnswerBubble from '../components/AnswerBubble';
import { useTranslation } from '../hooks/useTranslation';
import { useChoiceRound } from '../hooks/useChoiceRound';
import { LETTER_PAIRS_STARS, generateLetterPairsRound } from './letterPairsLogic';
import type { GameDifficulty } from '../types/game';
import { INK, hardShadow } from '../theme/blockTable';

export default function LetterPairs() {
  const { language, t } = useTranslation();
  const items = t.anlautGame.items as Record<string, string>;
  const { level, round, roundNo, solved, wrong, changeLevel, choose } = useChoiceRound(
    (lvl: GameDifficulty) => generateLetterPairsRound(lvl, language, items),
    LETTER_PAIRS_STARS,
  );

  const subtitle =
    level === 'easy' ? t.letterPairs.subtitleSame : level === 'medium' ? t.letterPairs.subtitlePartner : t.letterPairs.subtitlePicture;

  return (
    <div className="flex-1 flex flex-col items-center gap-4 p-4 w-full select-none max-w-lg mx-auto">
      {solved && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.letterPairs.title}</h2>
        <p data-testid="letter-pairs-subtitle" className="text-slate-500 font-extrabold text-sm">{subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div className="flex-1 flex items-center justify-center">
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
            <span className={round.kind === 'picture' ? 'text-5xl' : 'text-5xl font-black'}>{option}</span>
          </AnswerBubble>
        ))}
      </div>

      <p className="text-slate-400 font-extrabold text-xs text-center">{t.letterPairs.help}</p>
    </div>
  );
}
