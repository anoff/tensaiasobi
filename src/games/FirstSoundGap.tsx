import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import { NotebookChoice, NotebookSheet } from '../components/Notebook';
import { useGameFX } from '../hooks/gameFXContext';
import { useLater } from '../hooks/useLater';
import { useTranslation } from '../hooks/useTranslation';
import { freshRound } from '../utils/freshRound';
import { MISSING_LETTER_STARS, generateMissingLetterRound, type MissingLetterRound } from './missingLetterLogic';

/** Pause on a solved round before the next one, in ms (same as the other pick-one games). */
const NEXT_MS = 1400;
const WRONG_MS = 900;

interface FirstSoundGapProps {
  onCorrect: () => void;
  onWrong: () => void;
}

/**
 * First Sound, hard level: the word has one gap anywhere (M_USE), pick the
 * missing letter. Like every hard level, a wrong tap moves on to a new word.
 */
export default function FirstSoundGap({ onCorrect, onWrong }: FirstSoundGapProps) {
  const { playSuccess, playError, onStarEarned } = useGameFX();
  const { language, t } = useTranslation();
  const items = t.anlautGame.items as Record<string, string>;
  // Every locale dictionary has plenty of fitting words (unit-tested), so null never reaches the UI.
  const generate = () => generateMissingLetterRound(language, items)!;
  const roundKey = (r: MissingLetterRound) => `${r.word}|${r.gapIndex}`;

  const [round, setRound] = useState<MissingLetterRound>(generate);
  const [roundNo, setRoundNo] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const { later } = useLater();

  const nextRound = () => {
    setRound((prev) => freshRound(generate, prev, roundKey));
    setRoundNo((n) => n + 1);
    setSolved(false);
    setWrong(null);
  };

  const choose = (option: string) => {
    if (solved || wrong !== null) return;
    if (option === round.answer) {
      setSolved(true);
      playSuccess();
      onStarEarned?.(MISSING_LETTER_STARS);
      onCorrect();
      later(nextRound, NEXT_MS);
      return;
    }
    setWrong(option);
    playError();
    onWrong();
    later(nextRound, WRONG_MS);
  };

  const chars = [...round.word];

  return (
    <NotebookSheet className="flex-1 flex flex-col gap-4 p-4 pb-5">
      {solved && <GameConfetti pieces={110} />}
      <div key={roundNo} className="flex-1 flex flex-col items-center justify-center gap-3 animate-pop-in">
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
      </div>

      <div className="w-full grid gap-2 grid-cols-1">
        {round.options.map((option) => (
          <NotebookChoice
            key={`${roundNo}-${option}`}
            state={solved && option === round.answer ? 'correct' : wrong === option ? 'wrong' : 'idle'}
            disabled={solved || wrong !== null}
            onClick={() => choose(option)}
            testId="missing-letter-option"
            dataAttrs={{ 'data-value': option }}
          >
            {option}
          </NotebookChoice>
        ))}
      </div>
    </NotebookSheet>
  );
}
