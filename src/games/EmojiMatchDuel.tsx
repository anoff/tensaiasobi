import { useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import { useTranslation } from '../hooks/useTranslation';
import { useGameFX } from '../hooks/gameFXContext';
import { useLater } from '../hooks/useLater';
import type { GameDifficulty } from '../types/game';
import { DobbleCardView } from './DobbleCardView';
import { CARD_EMOJI_SIZE, buildShuffledDeck, deckOrder, drawFromPile, findMatch, type DobbleCard } from './emojiMatchDeck';

/** Points needed to win a duel. */
export const DUEL_GOAL = 10;
/** A wrong tap freezes only that player's card for this long. */
const FREEZE_MS = 1000;

type Player = 0 | 1;

interface DuelState {
  fullDeck: DobbleCard[];
  pile: DobbleCard[];
  /** [player 1's card, player 2's card]; any two cards of a deck share exactly one emoji. */
  cards: [DobbleCard, DobbleCard];
}

function dealDuel(diff: GameDifficulty): DuelState {
  const deck = buildShuffledDeck(deckOrder(diff));
  return { fullDeck: deck, cards: [deck[0], deck[1]], pile: deck.slice(2) };
}

/** Both players get a fresh card; the two new cards are always different. */
function dealNextPair(prev: DuelState): DuelState {
  const first = drawFromPile(prev.pile, prev.fullDeck, []);
  const second = drawFromPile(first.pile, prev.fullDeck, [first.card]);
  return { ...prev, cards: [first.card, second.card], pile: second.pile };
}

interface EmojiMatchDuelProps {
  difficulty: GameDifficulty;
  onExit: () => void;
}

/**
 * Two players, one phone lying between them. The screen is split in half and
 * each player owns the card on their half (player 2's is upside down). The two
 * cards share exactly one emoji: whoever taps it first on their own card
 * scores, then both players get a new card. First to DUEL_GOAL wins.
 */
export function EmojiMatchDuel({ difficulty, onExit }: EmojiMatchDuelProps) {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const { t } = useTranslation();
  const [state, setState] = useState<DuelState>(() => dealDuel(difficulty));
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [frozen, setFrozen] = useState<[boolean, boolean]>([false, false]);
  const [matched, setMatched] = useState<{ player: Player; emoji: string } | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [dealNo, setDealNo] = useState(0);
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

    if (emoji !== findMatch(state.cards[0], state.cards[1])) {
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
      setState(dealNextPair);
      setDealNo((n) => n + 1);
    }, 700);
  };

  // Each card gets half the screen: as big as fits both the width and half the height.
  const sizeClass = 'w-[min(20rem,82vw,34dvh)] h-[min(20rem,82vw,34dvh)]';
  const emojiClass = CARD_EMOJI_SIZE[difficulty];

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

  /** One player's half: their card, then their score at the edge nearest them. */
  const half = (player: Player) => (
    <div
      data-testid={`duel-half-${player + 1}`}
      className={`flex-1 w-full flex flex-col items-center justify-center gap-3 rounded-3xl ${
        player === 0 ? 'bg-sky-50/70' : 'bg-rose-50/70 rotate-180'
      }`}
    >
      <div key={`p${player + 1}-${dealNo}`}>
        <DobbleCardView
          card={state.cards[player]}
          testId={`duel-card-${player + 1}`}
          sizeClass={`${sizeClass} ${player === 0 ? '!border-sky-300' : '!border-rose-300'}`}
          emojiClass={emojiClass}
          matchedEmoji={matched?.emoji ?? null}
          shake={frozen[player]}
          frozen={frozen[player]}
          onTap={(emoji) => tap(player, emoji)}
        />
      </div>
      {scoreChip(player)}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center w-full p-2 gap-1 relative" data-testid="duel-board">
      {winner !== null && <GameConfetti pieces={160} />}

      {/* Player 2 sits across the table, so their half is upside down. */}
      {half(1)}

      <div className="w-full flex items-center gap-2">
        <span className="flex-1 border-t-2 border-dashed border-slate-300" aria-hidden="true" />
        <button
          type="button"
          onClick={() => { playPop(); onExit(); }}
          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-full"
        >
          ⬅️
        </button>
        <span className="flex-1 border-t-2 border-dashed border-slate-300" aria-hidden="true" />
      </div>

      {half(0)}

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
