import { useState, type ReactNode } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import { useGameFX } from '../hooks/gameFXContext';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import type { GameDifficulty } from '../types/game';
import { INK, hardShadow } from '../theme/blockTable';
import {
  GENIE_STARS, MAX_WRONG_GUESSES, TRAIT_ICONS, answer, guess, newGenie, nextQuestion, plausible, reject,
  type GenieState, type Trait,
} from './animalGenieLogic';

type Phase = 'think' | 'ask' | 'guess' | 'found' | 'stumped' | 'revealed';

export default function AnimalGenie() {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const { t } = useTranslation();
  const names = t.anlautGame.items as Record<string, string>;
  const [level, setLevel] = useAgeDifficulty();
  const [state, setState] = useState<GenieState>(() => newGenie(level));
  const [phase, setPhase] = useState<Phase>('think');
  const [question, setQuestion] = useState<Trait | null>(null);
  const [guessed, setGuessed] = useState<string | null>(null);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [revealed, setRevealed] = useState<string | null>(null);

  const restart = (lvl: GameDifficulty = level) => {
    setState(newGenie(lvl));
    setPhase('think');
    setQuestion(null);
    setGuessed(null);
    setWrongGuesses(0);
    setRevealed(null);
  };

  const changeLevel = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
    restart(lvl);
  };

  /** Ask the next question, or guess when no question helps any more. */
  const advance = (next: GenieState, wrong: number) => {
    setState(next);
    const q = nextQuestion(next);
    if (q) {
      setQuestion(q);
      setPhase('ask');
      return;
    }
    const g = guess(next);
    if (!g || wrong >= MAX_WRONG_GUESSES) {
      setPhase('stumped');
      return;
    }
    setGuessed(g);
    setPhase('guess');
  };

  const reply = (value: boolean | null) => {
    if (!question) return;
    playPop();
    advance(answer(state, question, value), wrongGuesses);
  };

  const confirmGuess = (right: boolean) => {
    if (!guessed) return;
    if (right) {
      playSuccess();
      onStarEarned?.(GENIE_STARS[level]);
      setPhase('found');
      return;
    }
    playError();
    const wrong = wrongGuesses + 1;
    setWrongGuesses(wrong);
    if (wrong >= MAX_WRONG_GUESSES) {
      setState(reject(state, guessed));
      setPhase('stumped');
      return;
    }
    advance(reject(state, guessed), wrong);
  };

  const reveal = (animal: string) => {
    playSuccess();
    onStarEarned?.(GENIE_STARS[level]);
    setRevealed(animal);
    setPhase('revealed');
  };

  // Easy/medium show the field shrinking (the deduction is the lesson); hard keeps the genie's secret.
  const showField = level !== 'hard';
  const inRunning = new Set(plausible(state));

  const animalGrid = (mode: 'show' | 'field' | 'pick') => (
    <div className={`grid gap-2 w-full ${state.pool.length > 20 ? 'grid-cols-6' : 'grid-cols-5'}`}>
      {state.pool.map((animal) => {
        const out = mode === 'field' && !inRunning.has(animal);
        return (
          <button
            key={animal}
            type="button"
            data-testid="genie-animal"
            data-animal={animal}
            data-out={out ? 'true' : 'false'}
            disabled={mode !== 'pick'}
            onClick={() => reveal(animal)}
            aria-label={names[animal]}
            className={`aspect-square flex items-center justify-center rounded-2xl bg-white border-2 border-slate-200 text-3xl transition-all duration-300 ${
              out ? 'opacity-15 grayscale scale-90' : ''
            } ${mode === 'pick' ? 'cursor-pointer active:scale-95 hover:bg-amber-50' : 'cursor-default'}`}
          >
            {animal}
          </button>
        );
      })}
    </div>
  );

  const genieSays = (children: ReactNode) => (
    <div className="flex items-center gap-3 w-full">
      <span aria-hidden="true" className="text-6xl leading-none">🧞</span>
      <div
        className="relative flex-1 rounded-3xl border-[3px] bg-white px-4 py-3 text-ink font-black text-lg"
        style={{ borderColor: INK, boxShadow: hardShadow(3, 4) }}
      >
        {children}
      </div>
    </div>
  );

  const finished = phase === 'found' || phase === 'revealed';

  return (
    <div className="flex-1 flex flex-col items-center gap-4 p-4 w-full select-none max-w-lg mx-auto">
      {finished && <GameConfetti pieces={140} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.animalGenie.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.animalGenie.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div data-testid="genie-stage" data-phase={phase} className="w-full flex-1 flex flex-col items-center gap-4">
        {phase === 'think' && (
          <>
            {genieSays(t.animalGenie.think)}
            {animalGrid('show')}
            <KidButton color="green" size="lg" data-testid="genie-ready" onClick={() => { playPop(); advance(state, 0); }} className="w-full">
              {t.animalGenie.ready}
            </KidButton>
          </>
        )}

        {phase === 'ask' && question && (
          <>
            <p data-testid="genie-question-count" className="text-xs font-black uppercase tracking-wider text-slate-400">
              {t.animalGenie.question.replace('{count}', String(state.asked.length + 1))}
            </p>
            {genieSays(
              <span data-testid="genie-question" data-trait={question} className="flex items-center gap-3">
                <span aria-hidden="true" className="text-4xl leading-none">{TRAIT_ICONS[question]}</span>
                <span>{t.animalGenie.questions[question]}</span>
              </span>,
            )}
            <div className="grid grid-cols-3 gap-3 w-full">
              <KidButton color="green" size="md" data-testid="genie-yes" onClick={() => reply(true)} className="flex-col gap-1">
                <span className="text-3xl">👍</span>
                <span className="text-sm font-black">{t.animalGenie.yes}</span>
              </KidButton>
              <KidButton color="red" size="md" data-testid="genie-no" onClick={() => reply(false)} className="flex-col gap-1">
                <span className="text-3xl">👎</span>
                <span className="text-sm font-black">{t.animalGenie.no}</span>
              </KidButton>
              <KidButton color="yellow" size="md" data-testid="genie-unsure" onClick={() => reply(null)} className="flex-col gap-1">
                <span className="text-3xl">🤷</span>
                <span className="text-sm font-black">{t.animalGenie.unsure}</span>
              </KidButton>
            </div>
            {showField && animalGrid('field')}
          </>
        )}

        {phase === 'guess' && guessed && (
          <>
            {genieSays(t.animalGenie.isIt)}
            <div data-testid="genie-guess" data-animal={guessed} className="flex flex-col items-center gap-1 animate-pop-in">
              <span className="text-9xl leading-none">{guessed}</span>
              <span className="text-2xl font-black text-ink">{names[guessed]}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <KidButton color="green" size="lg" data-testid="genie-guess-yes" onClick={() => confirmGuess(true)}>
                👍 {t.animalGenie.yes}
              </KidButton>
              <KidButton color="red" size="lg" data-testid="genie-guess-no" onClick={() => confirmGuess(false)}>
                👎 {t.animalGenie.no}
              </KidButton>
            </div>
          </>
        )}

        {phase === 'stumped' && (
          <>
            {genieSays(t.animalGenie.stumped)}
            {animalGrid('pick')}
          </>
        )}

        {finished && (
          <>
            {genieSays(phase === 'found' ? t.animalGenie.knewIt : t.animalGenie.youWin)}
            <div className="flex flex-col items-center gap-1 animate-pop-in">
              <span className="text-9xl leading-none">{phase === 'found' ? guessed : revealed}</span>
              <span className="text-2xl font-black text-ink">{names[(phase === 'found' ? guessed : revealed) ?? '']}</span>
            </div>
            <KidButton color="blue" size="lg" data-testid="genie-again" onClick={() => { playPop(); restart(); }} className="w-full">
              🔄 {t.animalGenie.playAgain}
            </KidButton>
          </>
        )}
      </div>
    </div>
  );
}
