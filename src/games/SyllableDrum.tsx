import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import { useGameFX } from '../hooks/gameFXContext';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { useLater } from '../hooks/useLater';
import { wrongMeansNewRound } from '../utils/difficulty';
import type { GameDifficulty } from '../types/game';
import { SYLLABLE_STARS, generateSyllableRound } from './syllableDrumLogic';
import { INK, hardShadow } from '../theme/blockTable';

/** More beats than any word has; stops a drum-roll from filling the screen. */
const MAX_BEATS = 6;

export default function SyllableDrum() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const { language, t } = useTranslation();
  const items = t.anlautGame.items as Record<string, string>;
  const [level, setLevel] = useAgeDifficulty();
  const [round, setRound] = useState(() => generateSyllableRound(level, language, items));
  const [roundNo, setRoundNo] = useState(0);
  const [beats, setBeats] = useState(0);
  const [solved, setSolved] = useState(false);
  const [shaking, setShaking] = useState(false);
  // After a miss on easy/medium, empty circles show how many beats the word has.
  const [hint, setHint] = useState(false);
  const [hit, setHit] = useState(false);
  const { later, cancelAll } = useLater();

  const nextRound = (lvl: GameDifficulty) => {
    cancelAll();
    setRound((prev) => generateSyllableRound(lvl, language, items, prev.emoji));
    setRoundNo((n) => n + 1);
    setBeats(0);
    setSolved(false);
    setShaking(false);
    setHint(false);
  };

  const changeLevel = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
    nextRound(lvl);
  };

  const drum = () => {
    if (solved || shaking) return;
    playPop();
    setBeats((b) => Math.min(MAX_BEATS, b + 1));
    setHit(true);
    later(() => setHit(false), 120);
  };

  const check = () => {
    if (solved || shaking || beats === 0) return;
    if (beats === round.parts.length) {
      setSolved(true);
      playSuccess();
      onStarEarned?.(SYLLABLE_STARS[level]);
      later(() => nextRound(level), 2000);
      return;
    }
    playError();
    setShaking(true);
    if (wrongMeansNewRound(level, challengeMode)) {
      later(() => nextRound(level), 1000);
    } else {
      later(() => {
        setShaking(false);
        setBeats(0);
        setHint(true);
      }, 700);
    }
  };

  // Help shrinks with the level: easy shows the word already split into beats,
  // medium shows it whole, hard only the picture (the child has to name it).
  const showWord = level !== 'hard' || solved;
  const showSplit = level === 'easy' || solved;
  const slots = hint || solved ? round.parts.length : beats;

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-4 w-full select-none max-w-lg mx-auto">
      {solved && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.syllableDrum.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.syllableDrum.subtitle}</p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        key={roundNo}
        data-testid="syllable-stage"
        data-syllables={round.parts.length}
        className="flex-1 flex flex-col items-center justify-center gap-3 animate-pop-in"
      >
        <span aria-hidden="true" className="text-8xl leading-none">{round.emoji}</span>
        {showWord && (
          <div data-testid="syllable-word" className="flex gap-1 text-3xl font-black text-ink">
            {showSplit
              ? round.parts.map((part, i) => (
                  <span key={i} data-testid="syllable-part" className={i % 2 === 0 ? 'text-emerald-600' : 'text-sky-600'}>
                    {part}
                    {i < round.parts.length - 1 && <span className="text-ink/30">·</span>}
                  </span>
                ))
              : round.parts.join('')}
          </div>
        )}

        {/* One dot per beat; after a miss, empty circles show the target count. */}
        <div
          data-testid="syllable-beats"
          data-beats={beats}
          className={`flex gap-2 min-h-[2rem] ${shaking ? 'animate-shake' : ''}`}
        >
          {Array.from({ length: Math.max(slots, beats) }, (_, i) => (
            <span
              key={i}
              className={`w-7 h-7 rounded-full border-4 ${
                i < beats ? (solved ? 'bg-emerald-500 border-emerald-600' : 'bg-candy-orange border-orange-600') : 'border-slate-400 border-dashed'
              }`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        data-testid="syllable-drum"
        aria-label={t.syllableDrum.drum}
        onClick={drum}
        disabled={solved}
        className={`w-40 h-40 rounded-full border-[3px] text-8xl leading-none flex items-center justify-center bg-[#fff8ec] cursor-pointer touch-manipulation transition-transform duration-75 ${
          hit ? 'scale-90' : ''
        }`}
        style={{ borderColor: INK, boxShadow: hardShadow() }}
      >
        🥁
      </button>

      <div className="flex gap-3 w-full">
        <KidButton
          color="orange"
          size="md"
          data-testid="syllable-reset"
          disabled={solved || beats === 0}
          onClick={() => {
            playPop();
            setBeats(0);
          }}
          className="flex-1"
        >
          ↺
        </KidButton>
        <KidButton color="green" size="md" data-testid="syllable-check" disabled={solved || beats === 0} onClick={check} className="flex-[2]">
          ✓ {t.syllableDrum.check}
        </KidButton>
      </div>

      <p className="text-slate-400 font-extrabold text-xs text-center">{t.syllableDrum.help}</p>
    </div>
  );
}
