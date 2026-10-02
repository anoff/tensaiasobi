import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import AnswerBubble from '../components/AnswerBubble';
import { useTranslation } from '../hooks/useTranslation';
import { useChoiceRound } from '../hooks/useChoiceRound';
import { PATTERN_STARS, generatePatternRound } from './patternTrainLogic';

export default function PatternTrain() {
  const { t } = useTranslation();
  const { level, round, roundNo, solved, wrong, changeLevel, choose } = useChoiceRound(generatePatternRound, PATTERN_STARS);

  return (
    <div className="flex-1 flex flex-col items-center gap-4 p-4 w-full select-none max-w-lg mx-auto">
      {solved && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.patternTrain.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.patternTrain.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        data-testid="pattern-stage"
        data-answer={round.answer}
        data-gap={round.gapIndex}
        className="w-full flex-1 flex flex-col justify-center gap-2 p-3 rounded-3xl border-4 border-slate-200 bg-gradient-to-b from-sky-100 to-emerald-50"
      >
        {/* Wagons wrap onto a second line instead of shrinking below tap size. */}
        <div key={roundNo} className="flex flex-wrap items-end justify-center gap-x-1 gap-y-3 animate-pop-in">
          <span aria-hidden="true" className="text-5xl leading-none">🚂</span>
          {round.wagons.map((wagon, i) => {
            const isGap = i === round.gapIndex;
            return (
              <span
                key={i}
                data-testid={isGap ? 'pattern-gap' : 'pattern-wagon'}
                className={`w-12 h-12 flex items-center justify-center rounded-xl border-4 text-3xl leading-none ${
                  isGap
                    ? solved
                      ? 'bg-emerald-200 border-emerald-500'
                      : 'bg-white border-dashed border-slate-400 text-slate-400 font-black'
                    : 'bg-candy-orange border-orange-600'
                }`}
              >
                {isGap && !solved ? '?' : wagon}
              </span>
            );
          })}
        </div>
        <div aria-hidden="true" className="w-full h-1.5 rounded-full bg-slate-400/60" />
      </div>

      <div className={`grid gap-4 w-full max-w-sm pb-2 ${round.options.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {round.options.map((option) => (
          <AnswerBubble
            key={`${roundNo}-${option}`}
            selected={(solved && option === round.answer) || wrong === option}
            correct={solved && option === round.answer ? true : wrong === option ? false : null}
            disabled={solved}
            onClick={() => choose(option, option === round.answer)}
            testId="pattern-option"
            dataAttrs={{ 'data-value': option }}
          >
            <span className="text-4xl">{option}</span>
          </AnswerBubble>
        ))}
      </div>

      <p className="text-slate-400 font-extrabold text-xs text-center">{t.patternTrain.help}</p>
    </div>
  );
}
