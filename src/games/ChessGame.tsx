import { useMemo, useState } from 'react';
import type { PieceSymbol, Square } from 'chess.js';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import ConfirmWipeButton from '../components/ConfirmWipeButton';
import { useGameFX } from '../hooks/gameFXContext';
import { useLater } from '../hooks/useLater';
import { useRoundTally } from '../hooks/useRoundTally';
import { useTranslation } from '../hooks/useTranslation';
import { characterArt } from '../data/stickers';
import { INK, LEAF, CORAL, COAL, hardShadow } from '../theme/blockTable';
import {
  CHESS_BOARD_DARK,
  CHESS_BOARD_LIGHT,
  pieceSrc,
  PROMOTION_PIECES,
} from './chessAssets';
import {
  type ChessMode,
  type CapturePuzzle,
  type HotseatState,
  type MovesPrompt,
  FILES,
  RANKS,
  applyCaptureMove,
  applyMove,
  gradeMovesTap,
  legalTargets,
  nextCapturePuzzle,
  nextMovesPrompt,
  piecesFromFen,
  pieceAt,
  startHotseat,
  tryHotseatMove,
  hotseatMoves,
  modeStars,
  sq,
} from './chessLogic';

const CREAM = '#fff8ec';
const INK_SOFT = '#6b5a4c';

type Phase = 'pick' | 'play';

export default function ChessGame() {
  const { t } = useTranslation();
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const tallyRound = useRoundTally();
  const { later, cancelAll } = useLater();

  const [phase, setPhase] = useState<Phase>('pick');
  const [mode, setMode] = useState<ChessMode | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [moveStep, setMoveStep] = useState(0);
  const [movesPrompt, setMovesPrompt] = useState<MovesPrompt | null>(null);
  const [capturePuzzle, setCapturePuzzle] = useState<CapturePuzzle | null>(null);
  const [hotseat, setHotseat] = useState<HotseatState | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [hintOn, setHintOn] = useState(false);
  const [playFen, setPlayFen] = useState<string | null>(null);
  const [captureStep, setCaptureStep] = useState(0);
  const [shake, setShake] = useState<Square | null>(null);
  const [locked, setLocked] = useState(false);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);

  const tortoise = characterArt('tortoise', 'idle');
  const tortoiseCheer = characterArt('tortoise', 'cheer');
  const panda = characterArt('panda', 'idle');

  const fen = mode === 'hotseat'
    ? hotseat?.fen
    : playFen ?? (mode === 'moves' ? movesPrompt?.fen : capturePuzzle?.fen);

  const pieces = useMemo(() => (fen ? piecesFromFen(fen) : []), [fen]);

  const currentCapture = capturePuzzle?.steps[captureStep];

  const legalHints = useMemo(() => {
    if (mode === 'hotseat' && selected && fen) {
      return hotseatMoves(fen, selected).map((m) => m.to);
    }
    if (!hintOn) return [] as Square[];
    if (mode === 'moves' && movesPrompt) return movesPrompt.legalTargets;
    if (mode === 'capture' && currentCapture && fen) return legalTargets(fen, currentCapture.from);
    return [] as Square[];
  }, [hintOn, mode, selected, fen, movesPrompt, currentCapture]);

  const captureTargets = useMemo(() => {
    if (!fen) return new Set<Square>();
    if (mode === 'hotseat' && selected) {
      return new Set(hotseatMoves(fen, selected).filter((m) => m.captured).map((m) => m.to));
    }
    if (mode === 'capture' && hintOn && currentCapture) {
      return new Set(hotseatMoves(fen, currentCapture.from).filter((m) => m.captured).map((m) => m.to));
    }
    return new Set<Square>();
  }, [fen, selected, mode, hintOn, currentCapture]);

  const promptText = (() => {
    if (phase === 'pick') return t.chessGame.pickMode;
    if (mode === 'moves' && movesPrompt) {
      const name = t.chessGame.pieces[movesPrompt.piece];
      return t.chessGame.movesPrompt.replace('{piece}', name);
    }
    if (mode === 'capture') return t.chessGame.capturePrompt;
    if (mode === 'hotseat' && hotseat) {
      if (hotseat.status === 'checkmate') {
        return hotseat.winner === 'w' ? t.chessGame.whiteWins : t.chessGame.blackWins;
      }
      if (hotseat.status === 'stalemate' || hotseat.status === 'draw') return t.chessGame.draw;
      if (hotseat.status === 'check') return t.chessGame.check;
      return hotseat.turn === 'w' ? t.chessGame.whiteToMove : t.chessGame.blackToMove;
    }
    return '';
  })();

  const startMode = (m: ChessMode) => {
    playPop();
    cancelAll();
    setMode(m);
    setPhase('play');
    setSelected(null);
    setHintOn(false);
    setShake(null);
    setLocked(false);
    setPromo(null);
    setShowConfetti(false);
    setMoveStep(0);
    setCaptureStep(0);
    if (m === 'moves') {
      const p = nextMovesPrompt(null, 0);
      setMovesPrompt(p);
      setPlayFen(p.fen);
      setCapturePuzzle(null);
      setHotseat(null);
    } else if (m === 'capture') {
      const p = nextCapturePuzzle(null);
      setCapturePuzzle(p);
      setPlayFen(p.fen);
      setMovesPrompt(null);
      setHotseat(null);
    } else {
      setHotseat(startHotseat());
      setPlayFen(null);
      setMovesPrompt(null);
      setCapturePuzzle(null);
    }
  };

  const backToModes = () => {
    playPop();
    cancelAll();
    setPhase('pick');
    setMode(null);
    setSelected(null);
    setHintOn(false);
    setPlayFen(null);
    setShake(null);
    setLocked(false);
    setPromo(null);
    setShowConfetti(false);
  };

  const flashMiss = (square: Square) => {
    playError();
    setShake(square);
    later(() => setShake(null), 400);
  };

  const awardHit = (m: ChessMode) => {
    playSuccess();
    setShowConfetti(true);
    onStarEarned?.(modeStars(m));
    tallyRound();
    later(() => setShowConfetti(false), 900);
  };

  const onSquare = (square: Square) => {
    if (locked || phase !== 'play' || !mode || promo) return;

    if (mode === 'moves' && movesPrompt) {
      if (square === movesPrompt.from) {
        playPop();
        setSelected(square);
        return;
      }
      if (gradeMovesTap(movesPrompt, square) === 'hit') {
        setLocked(true);
        setSelected(movesPrompt.from);
        setHintOn(false);
        setPlayFen(applyMove(movesPrompt.fen, movesPrompt.from, square));
        later(() => {
          awardHit('moves');
          later(() => {
            const nextStep = moveStep + 1;
            setMoveStep(nextStep);
            const next = nextMovesPrompt(movesPrompt.id, nextStep);
            setMovesPrompt(next);
            setPlayFen(next.fen);
            setSelected(null);
            setHintOn(false);
            setLocked(false);
          }, 700);
        }, 450);
      } else {
        flashMiss(square);
      }
      return;
    }

    if (mode === 'capture' && capturePuzzle && currentCapture && fen) {
      const piece = pieceAt(fen, square);
      if (!selected) {
        if (piece && piece.color === capturePuzzle.side && square === currentCapture.from) {
          playPop();
          setSelected(square);
        } else {
          flashMiss(square);
        }
        return;
      }
      if (piece && piece.color === capturePuzzle.side) {
        if (square === currentCapture.from) {
          playPop();
          setSelected(square);
        } else {
          flashMiss(square);
        }
        return;
      }
      if (selected === currentCapture.from && square === currentCapture.to) {
        setLocked(true);
        setHintOn(false);
        setPlayFen(applyCaptureMove(fen, currentCapture.from, square, capturePuzzle.side));
        setSelected(null);
        later(() => {
          const nextIdx = captureStep + 1;
          if (nextIdx < capturePuzzle.steps.length) {
            setCaptureStep(nextIdx);
            setLocked(false);
          } else {
            awardHit('capture');
            later(() => {
              const next = nextCapturePuzzle(capturePuzzle.id);
              setCapturePuzzle(next);
              setCaptureStep(0);
              setPlayFen(next.fen);
              setSelected(null);
              setHintOn(false);
              setLocked(false);
            }, 700);
          }
        }, 450);
      } else {
        flashMiss(square);
      }
      return;
    }

    if (mode === 'hotseat' && hotseat && fen) {
      if (hotseat.status === 'checkmate' || hotseat.status === 'stalemate' || hotseat.status === 'draw') return;
      const piece = pieceAt(fen, square);
      if (!selected) {
        if (piece && piece.color === hotseat.turn) {
          playPop();
          setSelected(square);
        }
        return;
      }
      if (piece && piece.color === hotseat.turn) {
        playPop();
        setSelected(square);
        return;
      }
      const result = tryHotseatMove(fen, selected, square);
      if (!result.ok) {
        flashMiss(square);
        return;
      }
      if (result.needsPromotion) {
        setPromo({ from: result.from, to: result.to });
        return;
      }
      playPop();
      setHotseat(result.state);
      setSelected(null);
      if (result.state.status === 'checkmate') {
        setLocked(true);
        later(() => {
          setShowConfetti(true);
          onStarEarned?.(modeStars('hotseat'));
          tallyRound();
          later(() => setShowConfetti(false), 900);
          setLocked(false);
        }, 450);
      }
    }
  };

  const confirmPromo = (promoPiece: PieceSymbol) => {
    if (!promo || !hotseat) return;
    const result = tryHotseatMove(hotseat.fen, promo.from, promo.to, promoPiece);
    setPromo(null);
    if (!result.ok || result.needsPromotion) return;
    playPop();
    setHotseat(result.state);
    setSelected(null);
    if (result.state.status === 'checkmate') {
      setLocked(true);
      later(() => {
        setShowConfetti(true);
        onStarEarned?.(modeStars('hotseat'));
        tallyRound();
        later(() => setShowConfetti(false), 900);
        setLocked(false);
      }, 450);
    }
  };

  const newHotseat = () => {
    playPop();
    setHotseat(startHotseat());
    setSelected(null);
    setPromo(null);
    setShowConfetti(false);
    setHintOn(false);
  };

  const cream = CREAM;

  return (
    <div className="relative flex-1 flex flex-col items-center w-full select-none max-w-lg mx-auto px-3 pt-2 pb-3 gap-2" data-testid="chess-root" data-phase={phase} data-mode={mode ?? 'pick'}>
      {showConfetti && <GameConfetti pieces={120} />}

      <div className="w-full flex items-center gap-2 min-h-[52px]">
        {tortoise && (
          <img
            src={hotseat?.status === 'checkmate' ? (tortoiseCheer ?? tortoise) : tortoise}
            alt=""
            className="h-12 w-12 shrink-0 object-contain pointer-events-none"
            data-testid="chess-tortoise"
          />
        )}
        <p
          className="flex-1 text-center text-lg font-black leading-tight"
          style={{ color: INK }}
          data-testid="chess-prompt"
        >
          {promptText}
        </p>
      </div>

      {phase === 'pick' && (
        <div className="w-full grid grid-cols-1 gap-3 mt-2" data-testid="chess-mode-picker">
          {([
            ['moves', t.chessGame.modeMoves],
            ['capture', t.chessGame.modeCapture],
            ['hotseat', t.chessGame.modeHotseat],
          ] as const).map(([id, label]) => (
            <KidButton
              key={id}
              color="green"
              size="lg"
              className="w-full min-h-24"
              data-testid={`chess-mode-${id}`}
              onClick={() => startMode(id)}
            >
              {label}
            </KidButton>
          ))}
        </div>
      )}

      {phase === 'play' && fen && (
        <>
          <ChessBoardView
            fen={fen}
            pieces={pieces}
            selected={selected}
            hints={legalHints}
            captureTargets={captureTargets}
            shake={shake}
            checkSquare={
              mode === 'hotseat' && hotseat && (hotseat.status === 'check' || hotseat.status === 'checkmate')
                ? pieces.find((p) => p.type === 'k' && p.color === hotseat.turn)?.square ?? null
                : null
            }
            onSquare={onSquare}
          />

          {promo && hotseat && (
            <div className="w-full grid grid-cols-4 gap-2" data-testid="chess-promotion">
              {PROMOTION_PIECES.map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`chess-promo-${p}`}
                  className="min-h-24 min-w-24 aspect-square rounded-[1.6rem] border-[3px] flex items-center justify-center active:translate-x-[5px] active:translate-y-[6px] active:[box-shadow:none]"
                  style={{ backgroundColor: cream, borderColor: INK, boxShadow: hardShadow() }}
                  onClick={() => confirmPromo(p)}
                >
                  <img src={pieceSrc(hotseat.turn, p)} alt="" className="h-[80%] w-[80%] object-contain pointer-events-none" />
                </button>
              ))}
            </div>
          )}

          <div className="w-full flex gap-2 justify-center mt-1">
            <KidButton color="yellow" size="md" className="min-h-24 min-w-[6.5rem]" data-testid="chess-done" onClick={backToModes}>
              {t.chessGame.done}
            </KidButton>
            {(mode === 'moves' || mode === 'capture') && (
              <KidButton
                color="green"
                size="md"
                className="min-h-24 min-w-[6.5rem]"
                data-testid="chess-hint"
                onClick={() => {
                  playPop();
                  setHintOn(true);
                }}
              >
                {t.chessGame.hint}
              </KidButton>
            )}
            {mode === 'hotseat' && (
              <ConfirmWipeButton
                label={t.chessGame.newGame}
                confirmLabel={t.chessGame.newGameConfirm}
                size="md"
                className="min-h-24 min-w-[6.5rem]"
                data-testid="chess-new-game"
                onConfirm={newHotseat}
              />
            )}
          </div>

          {panda && (
            <img
              src={panda}
              alt=""
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-2 h-[76px] w-[76px] object-contain short:hidden tiny:hidden"
              data-testid="chess-panda"
            />
          )}
        </>
      )}
    </div>
  );
}

function ChessBoardView({
  fen,
  pieces,
  selected,
  hints,
  captureTargets,
  shake,
  checkSquare,
  onSquare,
}: {
  fen: string;
  pieces: ReturnType<typeof piecesFromFen>;
  selected: Square | null;
  hints: Square[];
  captureTargets: Set<Square>;
  shake: Square | null;
  checkSquare: Square | null;
  onSquare: (s: Square) => void;
}) {
  const pieceMap = useMemo(() => {
    const m = new Map<Square, (typeof pieces)[number]>();
    for (const p of pieces) m.set(p.square, p);
    return m;
  }, [pieces]);

  const hintSet = useMemo(() => new Set(hints), [hints]);

  // Rank 8 at top (white's view); files a-h left to right.
  const ranks = [...RANKS].reverse();

  return (
    <div className="w-full max-w-[min(100%,360px)] mx-auto" data-testid="chess-board" data-fen={fen}>
      <div
        className="relative w-full aspect-square rounded-[1.1rem] border-4 p-[3px]"
        style={{ borderColor: INK, backgroundColor: COAL, boxShadow: hardShadow(5, 6) }}
      >
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full overflow-hidden rounded-[0.7rem]">
          {ranks.map((_, rankIdx) =>
            [...FILES].map((_, fileIdx) => {
              const square = sq(fileIdx, 7 - rankIdx);
              const dark = (fileIdx + (7 - rankIdx)) % 2 === 0;
              const piece = pieceMap.get(square);
              const isSelected = selected === square;
              const isHint = hintSet.has(square);
              const isCapture = captureTargets.has(square);
              const isShake = shake === square;
              const isCheck = checkSquare === square;
              return (
                <button
                  key={square}
                  type="button"
                  data-testid={`chess-sq-${square}`}
                  data-square={square}
                  data-tile={dark ? 'walnut' : 'cream'}
                  data-piece={piece ? `${piece.color}${piece.type}` : ''}
                  className={`relative p-0 border-0 outline-none touch-manipulation ${isShake ? 'animate-shake' : ''}`}
                  onClick={() => onSquare(square)}
                >
                  <img
                    src={dark ? CHESS_BOARD_DARK : CHESS_BOARD_LIGHT}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                  />
                  {isSelected && (
                    <span
                      className="absolute inset-[2px] rounded-sm pointer-events-none"
                      style={{ boxShadow: `inset 0 0 0 2px ${LEAF}` }}
                      data-testid="chess-selected"
                    />
                  )}
                  {isCheck && (
                    <span
                      className="absolute inset-[1px] rounded-sm pointer-events-none"
                      style={{ boxShadow: `inset 0 0 0 3px ${INK}` }}
                      data-testid="chess-check-ring"
                    />
                  )}
                  {isHint && !piece && (
                    <span
                      className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                      style={{ backgroundColor: LEAF }}
                      data-testid="chess-hint-dot"
                    />
                  )}
                  {(isCapture || (isHint && piece)) && piece && (
                    <span
                      className="absolute inset-[10%] rounded-full pointer-events-none"
                      style={{ boxShadow: `inset 0 0 0 2px ${LEAF}` }}
                      data-testid="chess-hint-capture"
                    />
                  )}
                  {isShake && (
                    <span className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `${CORAL}55` }} />
                  )}
                  {piece && (
                    <img
                      src={pieceSrc(piece.color, piece.type)}
                      alt=""
                      className="relative z-[1] mx-auto h-[84%] w-[84%] object-contain pointer-events-none"
                      draggable={false}
                    />
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>
      <div className="mt-1 flex justify-between px-1 text-[12px] font-extrabold" style={{ color: INK_SOFT }} aria-hidden>
        {[...FILES].map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
}
