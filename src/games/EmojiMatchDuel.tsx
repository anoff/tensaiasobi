import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import { useTranslation } from '../hooks/useTranslation';
import { useGameFX } from '../hooks/gameFXContext';
import { useLater } from '../hooks/useLater';
import type { GameDifficulty } from '../types/game';
import { DobbleCardView } from './DobbleCardView';
import { buildShuffledDeck, deckOrder, drawFromPile, findMatch, type DobbleCard } from './emojiMatchDeck';

/** Points needed to win a duel. */
export const DUEL_GOAL = 10;
/** A wrong tap freezes only that player's card for this long. */
const FREEZE_MS = 1000;

type Player = 0 | 1;

interface DuelState {
  fullDeck: DobbleCard[];
  pile: DobbleCard[];
  center: DobbleCard;
  cards: [DobbleCard, DobbleCard];
}

function dealDuel(diff: GameDifficulty): DuelState {
  const deck = buildShuffledDeck(deckOrder(diff));
  return { fullDeck: deck, center: deck[0], cards: [deck[1], deck[2]], pile: deck.slice(3) };
}

const EMOJI_SIZE: Record<GameDifficulty, string> = {
  easy: 'text-4xl',
  medium: 'text-4xl',
  hard: 'text-3xl',
};

interface EmojiMatchDuelProps {
  difficulty: GameDifficulty;
  onExit: () => void;
}

/**
 * Two players, one phone lying between them. Each player owns the card at
 * their end (player 2's is upside down); whoever first taps the emoji their
 * card shares with the middle card scores, and their card becomes the new
 * middle card. First to DUEL_GOAL wins.
 */
export function EmojiMatchDuel({ difficulty, onExit }: EmojiMatchDuelProps) {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const { t } = useTranslation();
  const [state, setState] = useState<DuelState>(() => dealDuel(difficulty));
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [frozen, setFrozen] = useState<[boolean, boolean]>([false, false]);
  const [matched, setMatched] = useState<{ player: Player; emoji: string } | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [cardKeys, setCardKeys] = useState<[number, number, number]>([0, 0, 0]);
  const { later, cancelAll } = useLater();

  const restart = () => {
    playPop();
    cancelAll();
    setState(dealDuel(difficulty));
    setScores([0, 0]);
    setFrozen([false, false]);
    setMatched(null);
    setWinner(null);
  };

  const tap = (player: Player, emoji: string) => {
    if (winner !== null || frozen[player] || matched) return;

    if (emoji !== findMatch(state.cards[player], state.center)) {
      playError();
      setFrozen((f) => (player === 0 ? [true, f[1]] : [f[0], true]));
      later(() => setFrozen((f) => (player === 0 ? [false, f[1]] : [f[0], false])), FREEZE_MS);
      return;
    }

    playSuccess();
    onStarEarned?.(1);
    setMatched({ player, emoji });
    const nextScore = scores[player] + 1;
    setScores((s) => (player === 0 ? [nextScore, s[1]] : [s[0], nextScore]));

    later(() => {
      setMatched(null);
      if (nextScore >= DUEL_GOAL) {
        setWinner(player);
        return;
      }
      // The winner's card goes to the middle; they draw a fresh one.
      setState((prev) => {
        const onTable = [prev.center, ...prev.cards];
        const { card, pile } = drawFromPile(prev.pile, prev.fullDeck, onTable);
        const cards: [DobbleCard, DobbleCard] = player === 0 ? [card, prev.cards[1]] : [prev.cards[0], card];
        return { ...prev, center: prev.cards[player], cards, pile };
      });
      setCardKeys(([c, a, b]) => [c + 1, player === 0 ? a + 1 : a, player === 1 ? b + 1 : b]);
    }, 500);
  };

  const sizeClass = 'w-44 h-44 sm:w-56 sm:h-56';
  const emojiClass = EMOJI_SIZE[difficulty];

  const scoreChip = (player: Player) => (
    <div
      data-testid={`duel-score-${player + 1}`}
      className={`px-4 py-1 rounded-full border-2 font-black text-sm ${
        player === 0 ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-rose-100 border-rose-300 text-rose-700'
      }`}
    >
      {player === 0 ? '🔵' : '🔴'} {scores[player]} / {DUEL_GOAL}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full p-2 relative" data-testid="duel-board">
      {winner !== null && <GameConfetti pieces={160} />}

      {/* Player 2 sits across the table: everything on their side is upside down. */}
      <div className="flex flex-col items-center gap-2 rotate-180">
        <div key={`p2-${cardKeys[2]}`}>
          <DobbleCardView
            card={state.cards[1]}
            testId="duel-card-2"
            sizeClass={`${sizeClass} !border-rose-300`}
            emojiClass={emojiClass}
            matchedEmoji={matched?.player === 1 ? matched.emoji : null}
            shake={frozen[1]}
            frozen={frozen[1]}
            onTap={(emoji) => tap(1, emoji)}
          />
        </div>
        {scoreChip(1)}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { playPop(); onExit(); }}
          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-full"
        >
          ⬅️
        </button>
        <div key={`center-${cardKeys[0]}`}>
          <DobbleCardView
            card={state.center}
            testId="duel-center"
            sizeClass={`${sizeClass} !border-amber-400 !bg-amber-50`}
            emojiClass={emojiClass}
            matchedEmoji={matched?.emoji ?? null}
            shake={false}
            readOnly
            onTap={() => undefined}
          />
        </div>
        <span className="w-8" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <div key={`p1-${cardKeys[1]}`}>
          <DobbleCardView
            card={state.cards[0]}
            testId="duel-card-1"
            sizeClass={`${sizeClass} !border-sky-300`}
            emojiClass={emojiClass}
            matchedEmoji={matched?.player === 0 ? matched.emoji : null}
            shake={frozen[0]}
            frozen={frozen[0]}
            onTap={(emoji) => tap(0, emoji)}
          />
        </div>
        {scoreChip(0)}
      </div>

      {winner !== null && (
        <div
          data-testid="duel-winner"
          data-winner={winner + 1}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[#ffe7c2]/90 backdrop-blur-md rounded-3xl"
        >
          {/* Shown the right way up for the player who won. */}
          <div className={`text-center space-y-4 ${winner === 1 ? 'rotate-180' : ''}`}>
            <p className="text-6xl">🏆</p>
            <h3 className="text-3xl font-black text-slate-800">{winner === 0 ? t.emojiMatch.p1Wins : t.emojiMatch.p2Wins}</h3>
            <p className="text-lg font-black text-slate-500">{scores[0]} : {scores[1]}</p>
          </div>
          <button
            type="button"
            data-testid="duel-play-again"
            onClick={restart}
            className="px-8 py-3 bg-candy-purple text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#9c27b0] border-2 border-purple-500 active:translate-y-[4px]"
          >
            🔄 {t.emojiMatch.playAgain}
          </button>
        </div>
      )}
    </div>
  );
}

export default EmojiMatchDuel;
