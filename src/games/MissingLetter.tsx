import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import { NotebookChoice, NotebookSheet } from '../components/Notebook';
import { useTranslation } from '../hooks/useTranslation';
import { useChoiceRound } from '../hooks/useChoiceRound';
import { MISSING_LETTER_STARS, generateMissingLetterRound } from './missingLetterLogic';
import type { GameDifficulty } from '../types/game';

export default function MissingLetter() {
  const { language, t } = useTranslation();
  const items = t.anlautGame.items as Record<string, string>;
  const { level, round, roundNo, solved, wrong, changeLevel, choose } = useChoiceRound(
    // Every locale dictionary has plenty of fitting words (unit-tested), so null never reaches the UI.
    (lvl: GameDifficulty) => generateMissingLetterRound(lvl, language, items)!,
    MISSING_LETTER_STARS,
  );

  const chars = [...round.word];

  return (
    <div className="flex-1 flex flex-col items-center p-4 w-full select-none max-w-lg mx-auto">
      {solved && <GameConfetti pieces={110} />}
      <NotebookSheet className="flex-1 flex flex-col gap-4 p-4 pb-5">
        <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} variant="paper" />

        <div key={roundNo} className="flex-1 flex flex-col items-center justify-center gap-3 animate-pop-in">
          <h2 className="sr-only">{t.missingLetter.title}</h2>
          <span aria-hidden="true" className="text-8xl leading-none">{round.emoji}</span>
          <div
            data-testid="missing-letter-word"
            data-word={round.word}
            data-answer={round.answer}
            className="flex flex-wrap justify-center gap-1 text-4xl font-black tracking-wide text-ink"
          >
            {chars.map((char, i) =>
              i === round.gapIndex ? (
                <span
                  key={i}
                  data-testid="missing-letter-gap"
                  className={`min-w-[1.1em] text-center border-b-4 ${solved ? 'text-emerald-600 border-emerald-500' : 'text-ink/25 border-ink/50'}`}
                >
                  {solved ? char : '?'}
                </span>
              ) : (
                <span key={i}>{char}</span>
              ),
            )}
          </div>
          <p className="text-slate-500 font-extrabold text-sm text-center">{t.missingLetter.subtitle}</p>
        </div>

        <div className={`w-full grid gap-2 ${round.options.length === 4 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {round.options.map((option) => (
            <NotebookChoice
              key={`${roundNo}-${option}`}
              state={solved && option === round.answer ? 'correct' : wrong === option ? 'wrong' : 'idle'}
              disabled={solved || wrong !== null}
              onClick={() => choose(option, option === round.answer)}
              testId="missing-letter-option"
              dataAttrs={{ 'data-value': option }}
            >
              {option}
            </NotebookChoice>
          ))}
        </div>
      </NotebookSheet>
    </div>
  );
}
