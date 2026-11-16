import { useEffect, useMemo, useRef, useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty } from '../types/game';
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
  type CapturedPiece,
  type HotseatState,
  type MovesPrompt,
  type PieceSymbol,
  type Square,
  hotseatBanner,
  FILES,
  RANKS,
  applyCaptureMove,
  applyMove,
  gradeMovesTap,
  kingsInDanger,
  legalMoves,
  nextCapturePuzzle,
  nextMovesPrompt,
  piecesFromFen,
  pieceAt,
  startHotseat,
  snapshotFromFen,
  modeStars,
  sq,
  visibleCaptureSquares,
} from './chessLogic';
import {
  chooseTortoiseMove,
  plannedThinkMs,
  tortoiseThinkMs,
  type TortoiseLevel,
} from './chessTortoise';

const CREAM = '#fff8ec';
const INK_SOFT = '#6b5a4c';

/** Test-only hook for e2e and screenshots (`?tortoiseFen=&tortoiseLevel=`). Not shown in the UI. */
function bootTortoise(fallback: GameDifficulty): { state: ReturnType<typeof snapshotFromFen>; level: GameDifficulty } {
  if (typeof window === 'undefined') return { state: startHotseat(), level: fallback };
  const params = new URLSearchParams(window.location.search);
  const fen = params.get('tortoiseFen');
  const raw = params.get('tortoiseLevel');
  const level: GameDifficulty =
    raw === 'medium' || raw === 'clever' ? 'medium'
    : raw === 'easy' || raw === 'gentle' ? 'easy'
    : fallback;
  return { state: fen ? snapshotFromFen(fen) : startHotseat(), level };
}


function tipDuration(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  return 400;
}

type Phase = 'pick' | 'play';

export default function ChessGame() {
  const { t } = useTranslation();
  const { playPop, playSuccess, playError, onStarEarned, onRoundComplete } = useGameFX();
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
  const [wonWhite, setWonWhite] = useState<CapturedPiece[]>([]);
  const [wonBlack, setWonBlack] = useState<CapturedPiece[]>([]);
  const [tippingKing, setTippingKing] = useState<{ square: Square; color: 'w' | 'b'; mover?: 'w' | 'b' } | null>(null);
  const [tortoiseLevel, setTortoiseLevel] = useState<GameDifficulty>('easy');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const tortoiseAwarded = useRef(false);


  const tortoiseIdle = characterArt('tortoise', 'idle');
  const tortoiseCheer = characterArt('tortoise', 'cheer');
  const pandaIdle = characterArt('panda', 'idle');
  const pandaCheer = characterArt('panda', 'cheer');


  const fen = mode === 'hotseat' || mode === 'tortoise'
    ? hotseat?.fen
    : playFen ?? (mode === 'moves' ? movesPrompt?.fen : capturePuzzle?.fen);

  const vsOver = mode === 'tortoise' && (hotseat?.status === 'won' || hotseat?.status === 'draw');
  const thinking = Boolean(
    mode === 'tortoise' &&
      hotseat &&
      hotseat.turn === 'b' &&
      hotseat.status === 'playing' &&
      !tippingKing &&
      !promo,
  );
  const childWon = mode === 'tortoise' && hotseat?.status === 'won' && hotseat.winner === 'w';
  const tortoiseWon = mode === 'tortoise' && hotseat?.status === 'won' && hotseat.winner === 'b';
  const tortoiseArt = childWon ? (tortoiseCheer ?? tortoiseIdle) : tortoiseIdle;
  const pandaArt = childWon ? (pandaCheer ?? pandaIdle) : pandaIdle;


  const pieces = useMemo(() => (fen ? piecesFromFen(fen) : []), [fen]);

  const boardPieces = useMemo(() => {
    if (mode !== 'capture' || !capturePuzzle) return pieces;
    const visible = visibleCaptureSquares(capturePuzzle, captureStep);
    return pieces.filter((piece) => visible.has(piece.square));
  }, [mode, pieces, capturePuzzle, captureStep]);

  const currentCapture = capturePuzzle?.steps[captureStep];

  const legalHints = useMemo(() => {
    if ((mode === 'hotseat' || (mode === 'tortoise' && !thinking && !vsOver && !tippingKing && hotseat?.turn === 'w')) && selected && fen) {
      return legalMoves(fen, selected).map((m) => m.to);
    }
    if (!hintOn) return [] as Square[];
    if (mode === 'moves' && movesPrompt) return movesPrompt.legalTargets;
    return [] as Square[];
  }, [hintOn, mode, selected, fen, movesPrompt, thinking, vsOver, tippingKing, hotseat?.turn]);

  const captureTargets = useMemo(() => {
    if (!fen) return new Set<Square>();
    if ((mode === 'hotseat' || (mode === 'tortoise' && !thinking && !vsOver && !tippingKing && hotseat?.turn === 'w')) && selected) {
      return new Set(legalMoves(fen, selected).filter((m) => m.captured).map((m) => m.to));
    }
    if (mode === 'capture' && hintOn && currentCapture) {
      return new Set<Square>([currentCapture.to]);
    }
    return new Set<Square>();
  }, [fen, selected, mode, hintOn, currentCapture, thinking, vsOver, tippingKing, hotseat?.turn]);

  const dangerSquares = useMemo(() => {
    if ((mode !== 'hotseat' && mode !== 'tortoise') || !fen || tippingKing || vsOver) return [] as Square[];
    return kingsInDanger(fen);
  }, [mode, fen, tippingKing, vsOver]);

  const promptText = (() => {
    if (phase === 'pick') return t.chessGame.pickMode;
    if (mode === 'moves' && movesPrompt) {
      const name = t.chessGame.pieces[movesPrompt.piece];
      return t.chessGame.movesPrompt.replace('{piece}', name);
    }
    if (mode === 'capture' && capturePuzzle && currentCapture && fen) {
      const target = pieceAt(fen, currentCapture.to);
      if (target?.type === 'k') return t.chessGame.takeKing;
      return t.chessGame.capturePrompt;
    }
    if (mode === 'capture') return t.chessGame.capturePrompt;
    if (mode === 'tortoise' && hotseat) {
      const ownKing = pieces.find((p) => p.type === 'k' && p.color === 'w');
      const banner = hotseatBanner(
        hotseat,
        tippingKing?.mover ?? null,
        Boolean(ownKing && dangerSquares.includes(ownKing.square)),
      );
      if (banner.kind === 'won') return banner.side === 'w' ? t.chessGame.whiteWins : t.chessGame.tortoiseWins;
      if (banner.kind === 'draw') return t.chessGame.draw;
      if (thinking || banner.side === 'b') return t.chessGame.tortoiseToMove;
      if (banner.kind === 'watchKing') return t.chessGame.watchKing;
      return t.chessGame.whiteToMove;
    }
    if (mode === 'hotseat' && hotseat) {
      const ownKing = pieces.find((p) => p.type === 'k' && p.color === hotseat.turn);
      const banner = hotseatBanner(
        hotseat,
        tippingKing?.mover ?? null,
        Boolean(ownKing && dangerSquares.includes(ownKing.square)),
      );
      if (banner.kind === 'won') return banner.side === 'w' ? t.chessGame.whiteWins : t.chessGame.blackWins;
      if (banner.kind === 'draw') return t.chessGame.draw;
      if (banner.kind === 'watchKing') return t.chessGame.watchKing;
      return banner.side === 'w' ? t.chessGame.whiteToMove : t.chessGame.blackToMove;
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
    setTippingKing(null);
    setShowConfetti(false);
    setMoveStep(0);
    setCaptureStep(0);
    setWonWhite([]);
    setWonBlack([]);
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
    } else if (m === 'hotseat') {
      setLastMove(null);
      setHotseat(startHotseat());
      setPlayFen(null);
      setMovesPrompt(null);
      setCapturePuzzle(null);
    } else {
      tortoiseAwarded.current = false;
      setLastMove(null);
      const boot = bootTortoise(tortoiseLevel);
      setTortoiseLevel(boot.level);
      setHotseat(boot.state);
      setPlayFen(null);
      setMovesPrompt(null);
      setCapturePuzzle(null);
      settleTortoise(boot.state);
    }
  };

  const resetTortoiseBoard = (state = startHotseat()) => {
    tortoiseAwarded.current = false;
    setLastMove(null);
    setSelected(null);
    setPromo(null);
    setTippingKing(null);
    setShowConfetti(false);
    setHintOn(false);
    setWonWhite([]);
    setWonBlack([]);
    setLocked(false);
    setHotseat(state);
  };

  const settleTortoise = (state: HotseatState) => {
    if (state.status !== 'won' && state.status !== 'draw') return;
    if (tortoiseAwarded.current) return;
    tortoiseAwarded.current = true;
    onStarEarned?.(modeStars('tortoise'));
    onRoundComplete?.();
    if (state.status === 'won' && state.winner === 'w') {
      setShowConfetti(true);
      later(() => setShowConfetti(false), 900);
    }
    setLocked(false);
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
    setTippingKing(null);
    setShowConfetti(false);
    setWonWhite([]);
    setWonBlack([]);
    setLastMove(null);
    tortoiseAwarded.current = false;
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
        const moved = applyMove(movesPrompt.fen, movesPrompt.from, square);
        if (!moved.ok || moved.needsPromotion) {
          flashMiss(square);
          return;
        }
        setLocked(true);
        setSelected(movesPrompt.from);
        setHintOn(false);
        setPlayFen(moved.state.fen);
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
        const target = pieceAt(fen, square);
        setLocked(true);
        setHintOn(false);
        setPlayFen(applyCaptureMove(fen, currentCapture.from, square, capturePuzzle.side));
        setSelected(null);
        const afterTake = () => {
          const nextIdx = captureStep + 1;
          setCaptureStep(nextIdx);
          if (nextIdx < capturePuzzle.steps.length) {
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
        };
        if (target?.type === 'k') {
          setTippingKing({ square, color: target.color });
          later(() => {
            setTippingKing(null);
            afterTake();
          }, tipDuration());
        } else {
          later(afterTake, 450);
        }
      } else {
        flashMiss(square);
      }
      return;
    }

    if (mode === 'tortoise' && hotseat && fen) {
      setLastMove(null);
      if (vsOver || thinking || tippingKing || hotseat.turn !== 'w') return;
      const piece = pieceAt(fen, square);
      if (!selected) {
        if (piece && piece.color === 'w') {
          playPop();
          setSelected(square);
        }
        return;
      }
      if (piece && piece.color === 'w') {
        playPop();
        setSelected(square);
        return;
      }
      const result = applyMove(fen, selected, square);
      if (!result.ok) {
        flashMiss(square);
        return;
      }
      if (result.needsPromotion) {
        setPromo({ from: result.from, to: result.to });
        return;
      }
      playPop();
      finishBoardMove(result, square, 'tortoise');
      return;
    }

    if (mode === 'hotseat' && hotseat && fen) {
      if (hotseat.status === 'won' || hotseat.status === 'draw') return;
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
      const result = applyMove(fen, selected, square);
      if (!result.ok) {
        flashMiss(square);
        return;
      }
      if (result.needsPromotion) {
        setPromo({ from: result.from, to: result.to });
        return;
      }
      playPop();
      finishBoardMove(result, square, 'hotseat');
    }
  };

  const recordCapture = (piece: CapturedPiece | null) => {
    if (!piece) return;
    if (piece.color === 'b') setWonWhite((prev) => [...prev, piece]);
    else setWonBlack((prev) => [...prev, piece]);
  };

  const celebrateWin = () => {
    setShowConfetti(true);
    onStarEarned?.(modeStars('hotseat'));
    tallyRound();
    later(() => setShowConfetti(false), 900);
  };

  const finishBoardMove = (
    result: Extract<ReturnType<typeof applyMove>, { ok: true; needsPromotion: false }>,
    dest: Square,
    kind: 'hotseat' | 'tortoise',
  ) => {
    setSelected(null);
    const afterTip = () => {
      recordCapture(result.captured);
      setHotseat(result.state);
      if (kind === 'tortoise') settleTortoise(result.state);
      else if (result.state.status === 'won') {
        setLocked(true);
        celebrateWin();
      }
    };
    if (result.captured?.type === 'k') {
      setLocked(true);
      setHotseat({ ...result.state, status: 'playing', winner: null });
      setTippingKing({ square: dest, color: result.captured.color, mover: result.state.winner ?? (result.state.turn === 'w' ? 'b' : 'w') });
      later(() => {
        setTippingKing(null);
        afterTip();
      }, tipDuration());
      return;
    }
    setHotseat(result.state);
    recordCapture(result.captured);
    if (kind === 'tortoise') settleTortoise(result.state);
    else if (result.state.status === 'won') {
      setLocked(true);
      celebrateWin();
    }
  };

  const confirmPromo = (promoPiece: PieceSymbol) => {
    if (!promo || !hotseat) return;
    const result = applyMove(hotseat.fen, promo.from, promo.to, promoPiece);
    setPromo(null);
    if (!result.ok || result.needsPromotion) return;
    playPop();
    finishBoardMove(result, promo.to, mode === 'tortoise' ? 'tortoise' : 'hotseat');
  };

  const newHotseat = () => {
    playPop();
    if (mode === 'tortoise') {
      resetTortoiseBoard();
      return;
    }
    setLocked(false);
    setHotseat(startHotseat());
    setSelected(null);
    setPromo(null);
    setTippingKing(null);
    setShowConfetti(false);
    setHintOn(false);
    setWonWhite([]);
    setWonBlack([]);
    setLastMove(null);
  };

  const playAgainTortoise = () => {
    playPop();
    resetTortoiseBoard();
  };

  useEffect(() => {
    if (mode !== 'tortoise' || !hotseat || tippingKing || promo) return;
    if (hotseat.status !== 'playing' || hotseat.turn !== 'b') return;
    let cancelled = false;
    const fen = hotseat.fen;
    const level: TortoiseLevel = tortoiseLevel === 'medium' ? 'clever' : 'gentle';
    let inner = 0;
    const outer = window.setTimeout(() => {
      if (cancelled) return;
      const planned = plannedThinkMs(Math.random);
      const started = Date.now();
      const choice = chooseTortoiseMove(fen, level, Math.random);
      const wait = tortoiseThinkMs({ plannedMs: planned, searchMs: Date.now() - started });
      inner = window.setTimeout(() => {
        if (cancelled) return;
        const result = applyMove(fen, choice.from, choice.to, choice.promotion ?? 'q');
        if (result.ok && !result.needsPromotion) {
          setLastMove({ from: choice.from, to: choice.to });
          finishBoardMove(result, choice.to, 'tortoise');
        }
      }, wait);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
    // The move applier is recreated each render; the fen/turn guards above are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hotseat, tortoiseLevel, tippingKing, promo]);

  const cream = CREAM;

  const hotseatSide = hotseat
    ? hotseatBanner(hotseat, tippingKing?.mover ?? null, false).side
    : null;
  const sideToPlay = mode === 'capture' && capturePuzzle
    ? capturePuzzle.side
    : (mode === 'hotseat' || mode === 'tortoise') && hotseat
      ? hotseatSide
      : null;
  const showSideDot = Boolean(
    (mode === 'capture' && capturePuzzle) ||
    (mode === 'hotseat' && hotseat && hotseat.status !== 'draw') ||
    (mode === 'tortoise' && hotseat && !vsOver),
  );

  return (
    <div
      className="relative flex-1 flex flex-col items-center w-full select-none max-w-lg mx-auto px-3 pt-2 pb-3 gap-2"
      data-testid="chess-root"
      data-phase={phase}
      data-mode={mode ?? 'pick'}
      data-thinking={thinking ? 'true' : 'false'}
    >
      {showConfetti && !tortoiseWon && <GameConfetti pieces={120} />}

      <div className="w-full flex items-center gap-2 min-h-[52px]">
        {tortoiseArt && (
          <img
            src={mode === 'tortoise' ? tortoiseArt : tortoiseIdle}
            alt=""
            className="h-12 w-12 shrink-0 object-contain pointer-events-none"
            data-testid="chess-tortoise"
          />
        )}
        {showSideDot && sideToPlay && (
          <span className="text-2xl leading-none pointer-events-none" data-testid="chess-side-dot" aria-hidden>
            {sideToPlay === 'w' ? '⚪' : '⚫'}
          </span>
        )}
        <p
          className="flex-1 text-center text-lg font-black leading-tight"
          style={{ color: INK }}
          data-testid="chess-prompt"
        >
          {promptText}
        </p>
        {thinking && (
          <span
            className="shrink-0 rounded-full px-3 py-1 text-sm font-black"
            style={{ backgroundColor: CREAM, color: INK, boxShadow: hardShadow(2, 2) }}
            data-testid="chess-thinking"
          >
            {t.chessGame.thinking}
          </span>
        )}
        {mode === 'capture' && capturePuzzle && (
          <span
            className="shrink-0 text-lg font-black tabular-nums"
            style={{ color: INK }}
            data-testid="chess-capture-progress"
          >
            {captureStep} / {capturePuzzle.steps.length}
          </span>
        )}
      </div>

      {phase === 'pick' && (
        <div className="w-full flex flex-col gap-3 mt-2" data-testid="chess-mode-picker">
          <div className="w-full grid grid-cols-2 gap-3">
            {([
              ['moves', t.chessGame.modeMoves],
              ['capture', t.chessGame.modeCapture],
              ['hotseat', t.chessGame.modeHotseat],
              ['tortoise', t.chessGame.modeTortoise],
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
          <div data-testid="chess-tortoise-levels">
            <DifficultySelector
              selected={tortoiseLevel}
              options={['easy', 'medium']}
              locked={null}
              labels={{ easy: t.chessGame.levelGentle, medium: t.chessGame.levelClever }}
              onChange={setTortoiseLevel}
            />
          </div>
        </div>
      )}

      {phase === 'play' && fen && (
        <>
          {(mode === 'hotseat' || mode === 'tortoise') && (
            <div className="w-full flex items-start gap-3 px-1" data-testid="chess-won-trays">
              <WonTray side="w" taken={wonWhite} />
              <WonTray side="b" taken={wonBlack} />
            </div>
          )}

          <ChessBoardView
            fen={fen}
            pieces={boardPieces}
            selected={selected}
            hints={legalHints}
            captureTargets={captureTargets}
            shake={shake}
            dangerSquares={dangerSquares}
            tippingKing={tippingKing}
            lastMove={mode === 'tortoise' ? lastMove : null}
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
            {mode === 'tortoise' && !vsOver && (
              <ConfirmWipeButton
                label={t.chessGame.newGame}
                confirmLabel={t.chessGame.newGameConfirm}
                size="md"
                className="min-h-24 min-w-[6.5rem]"
                data-testid="chess-new-game"
                onConfirm={newHotseat}
              />
            )}
            {mode === 'tortoise' && vsOver && (
              <KidButton
                color="green"
                size="md"
                className="min-h-24 min-w-[6.5rem]"
                data-testid="chess-play-again"
                onClick={playAgainTortoise}
              >
                {t.chessGame.playAgain}
              </KidButton>
            )}
          </div>

          {(mode === 'tortoise' ? pandaArt : pandaIdle) && (
            <img
              src={mode === 'tortoise' ? pandaArt : (hotseat?.status === 'won' ? (pandaCheer ?? pandaIdle) : pandaIdle)}
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

function WonTray({ side, taken }: { side: 'w' | 'b'; taken: CapturedPiece[] }) {
  const overflow = taken.length > 6;
  const items = overflow
    ? (['q', 'r', 'b', 'n', 'p', 'k'] as const)
        .map((type) => {
          const match = taken.find((piece) => piece.type === type);
          return {
            type,
            color: match?.color,
            count: taken.filter((piece) => piece.type === type).length,
          };
        })
        .filter((item) => item.count > 0 && item.color)
    : taken.map((piece) => ({ type: piece.type, color: piece.color, count: 1 }));

  return (
    <div
      className="flex flex-1 items-center gap-1 min-h-8 min-w-0 pointer-events-none overflow-hidden"
      data-testid={side === 'w' ? 'chess-won-white' : 'chess-won-black'}
    >
      <span className="text-lg leading-none" aria-hidden>{side === 'w' ? '⚪' : '⚫'}</span>
      <span className="text-sm font-black tabular-nums" style={{ color: INK }} data-testid={side === 'w' ? 'chess-won-count-w' : 'chess-won-count-b'}>
        {taken.length}
      </span>
      {items.map((item, i) => (
        <span key={`${item.type}-${i}`} className="relative shrink-0 flex items-center">
          <img
            src={pieceSrc(item.color!, item.type)}
            alt=""
            className="h-7 w-7 object-contain pointer-events-none"
            draggable={false}
          />
          {item.count > 1 && (
            <span className="text-[11px] font-black" style={{ color: INK }}>×{item.count}</span>
          )}
        </span>
      ))}
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
  dangerSquares,
  tippingKing,
  lastMove,
  onSquare,
}: {
  fen: string;
  pieces: ReturnType<typeof piecesFromFen>;
  selected: Square | null;
  hints: Square[];
  captureTargets: Set<Square>;
  shake: Square | null;
  dangerSquares: Square[];
  tippingKing: { square: Square; color: 'w' | 'b'; mover?: 'w' | 'b' } | null;
  lastMove: { from: Square; to: Square } | null;
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
              const isDanger = dangerSquares.includes(square);
              const isTip = tippingKing?.square === square;
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
                  {lastMove && (square === lastMove.from || square === lastMove.to) && (
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundColor: `${LEAF}33` }}
                      data-testid="chess-last-move"
                    />
                  )}
                  {isDanger && (
                    <span
                      className="absolute inset-[1px] rounded-sm pointer-events-none"
                      style={{ boxShadow: `inset 0 0 0 3px ${INK}` }}
                      data-testid="chess-danger-ring"
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
                  {isTip && tippingKing && (
                    <img
                      src={pieceSrc(tippingKing.color, 'k')}
                      alt=""
                      className="absolute inset-0 z-[2] m-auto h-[84%] w-[84%] object-contain pointer-events-none animate-king-tip"
                      data-testid="chess-king-tip"
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
