import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import { NotebookTally } from '../components/Notebook';
import { useTranslation } from '../hooks/useTranslation';
import { useChoiceRound } from '../hooks/useChoiceRound';
import { COMPARE_STARS, generateCompareRound, type CompareSide, type CompareSymbol } from './crocodileCompareLogic';
import { INK, hardShadow } from '../theme/blockTable';

type Side = 'left' | 'right';
const SYMBOLS: CompareSymbol[] = ['<', '=', '>'];

export default function CrocodileCompare() {
  const { t } = useTranslation();
  const { level, round, roundNo, solved, wrong, missed, changeLevel, choose } = useChoiceRound(
    generateCompareRound,
    COMPARE_STARS,
    (r) => `${r.left.addends ?? r.left.value}|${r.right.addends ?? r.right.value}`,
  );

  const showDots = level === 'medium' && missed;
  const symbolShown = solved ? round.symbol : level === 'hard' ? '?' : '';
  // 🐊 faces left in the font. It points up (no hint) until the round is solved,
  // then opens its mouth toward the bigger side; on "=" it keeps pointing up.
  const crocTransform = !solved || round.symbol === '=' ? 'rotate(90deg)' : round.symbol === '<' ? 'scaleX(-1)' : 'none';

  const sideContent = (side: CompareSide) => {
    if (level === 'easy') {
      return (
        <div className={`grid gap-1 text-3xl leading-none ${side.value > 2 ? 'grid-cols-3' : side.value === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {Array.from({ length: side.value }, (_, i) => <span key={i}>{round.emoji}</span>)}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2">
        <span className={`font-black tabular-nums leading-none ${side.addends ? 'text-4xl' : 'text-6xl'}`}>
          {side.addends ? `${side.addends[0]} + ${side.addends[1]}` : side.value}
        </span>
        {showDots && <NotebookTally count={side.value} />}
      </div>
    );
  };

  const sideCard = (key: Side, side: CompareSide) => {
    const tappable = level !== 'hard';
    const isBigger = round.bigger === key;
    const state = solved && isBigger ? 'correct' : wrong === key ? 'wrong' : 'idle';
    return (
      <button
        type="button"
        data-testid={`compare-${key}`}
        data-value={side.value}
        disabled={!tappable || solved}
        onClick={() => choose(key, isBigger)}
        className={`flex-1 min-h-[160px] min-w-[96px] flex items-center justify-center p-3 rounded-3xl border-[3px] text-ink transition-colors ${
          state === 'wrong' ? 'animate-shake' : ''
        } ${tappable ? 'cursor-pointer active:translate-y-[4px]' : 'cursor-default'}`}
        style={{
          borderColor: INK,
          backgroundColor: state === 'correct' ? '#bbf7d0' : state === 'wrong' ? '#fecaca' : '#fff8ec',
          boxShadow: tappable ? hardShadow(4, 5) : 'none',
        }}
      >
        {sideContent(side)}
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-4 w-full select-none max-w-lg mx-auto">
      {solved && <GameConfetti pieces={110} />}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.crocodileCompare.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">
          {level === 'hard' ? t.crocodileCompare.subtitleSymbols : t.crocodileCompare.subtitle}
        </p>
      </div>

      <DifficultySelector selected={level} options={['easy', 'medium', 'hard']} onChange={changeLevel} />

      <div
        key={roundNo}
        data-testid="compare-stage"
        data-symbol={round.symbol}
        data-bigger={round.bigger ?? ''}
        className="w-full flex-1 flex items-center gap-2 animate-pop-in"
      >
        {sideCard('left', round.left)}
        <div className="flex flex-col items-center gap-1 w-16 shrink-0">
          <span
            aria-hidden="true"
            className="text-5xl leading-none transition-transform duration-300"
            data-testid="compare-croc"
            style={{ transform: crocTransform }}
          >
            🐊
          </span>
          <span data-testid="compare-symbol" className="text-4xl font-black text-ink min-h-[2.5rem]">
            {symbolShown}
          </span>
        </div>
        {sideCard('right', round.right)}
      </div>

      {level === 'hard' && (
        <div className="grid grid-cols-3 gap-3 w-full">
          {SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              type="button"
              data-testid="compare-symbol-option"
              data-symbol={symbol}
              disabled={solved}
              onClick={() => choose(symbol, symbol === round.symbol)}
              className={`min-h-[80px] rounded-2xl border-[3px] text-5xl font-black text-ink active:translate-y-[4px] ${
                wrong === symbol ? 'animate-shake' : ''
              }`}
              style={{
                borderColor: INK,
                backgroundColor: solved && symbol === round.symbol ? '#bbf7d0' : wrong === symbol ? '#fecaca' : '#fff8ec',
                boxShadow: hardShadow(4, 5),
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
      )}

      <p className="text-slate-400 font-extrabold text-xs text-center">
        {level === 'hard' ? t.crocodileCompare.helpSymbols : t.crocodileCompare.help}
      </p>
    </div>
  );
}
