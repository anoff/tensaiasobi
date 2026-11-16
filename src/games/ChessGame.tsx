import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  FOX_THINK_SRC,
} from './chessAssets';
import {
  type ChessMode,
  type CapturePuzzle,
  type CapturedPiece,
  type HotseatState,
  type MovesPrompt,
  type PieceSymbol,
  type Square,
  type ChessMove,
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
  parseSq,
  sq,
  visibleCaptureSquares,
} from './chessLogic';
import {
  chooseFoxMove,
  castleRookHop,
  findFoxMove,
  foxPiecePath,
  foxThinkMs,
  plannedThinkMs,
  FOX_HIGHLIGHT_MS,
  FOX_STEP_MS,
  FOX_OVERLAY_MS,
  FOX_STICKER_HOLD_MS,
  type FoxLevel,
} from './chessFox';
import FoxThoughtBubble from './FoxThoughtBubble';

const CREAM = '#fff8ec';
const INK_SOFT = '#6b5a4c';

type FoxPauseAt = 'think' | 'highlight' | 'move';

type FoxAnim = {
  phase: 'highlight' | 'move';
  from: Square;
  to: Square;
  visual: Square;
  piece: { type: PieceSymbol; color: 'w' | 'b' };
  castleRook?: { from: Square; to: Square; visual: Square; hopping: boolean };
};

/** Test-only hooks (`?foxFen=&foxLevel=&foxThinkMs=&foxPauseAt=`). Not shown in the UI. */
function bootFox(fallback: GameDifficulty): {
  state: ReturnType<typeof snapshotFromFen>;
  level: GameDifficulty;
  thinkMs: number | null;
  pauseAt: FoxPauseAt | null;
} {
  if (typeof window === 'undefined') {
    return { state: startHotseat(), level: fallback, thinkMs: null, pauseAt: null };
  }
  const params = new URLSearchParams(window.location.search);
  const fen = params.get('foxFen');
  const raw = params.get('foxLevel');
  const level: GameDifficulty =
    raw === 'medium' || raw === 'clever' ? 'medium'
    : raw === 'easy' || raw === 'gentle' ? 'easy'
    : fallback;
  const thinkRaw = params.get('foxThinkMs');
  const thinkParsed = thinkRaw != null && thinkRaw !== '' ? Number(thinkRaw) : NaN;
  const thinkMs = Number.isFinite(thinkParsed) ? Math.max(0, thinkParsed) : null;
  const pauseRaw = params.get('foxPauseAt');
  const pauseAt: FoxPauseAt | null =
    pauseRaw === 'think' || pauseRaw === 'highlight' || pauseRaw === 'move' ? pauseRaw : null;
  return { state: fen ? snapshotFromFen(fen) : startHotseat(), level, thinkMs, pauseAt };
}

function tipDuration(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  return 400;
}

function squareOffset(square: Square): { left: string; top: string } {
  const { file, rank } = parseSq(square);
  return { left: `${file * 12.5}%`, top: `${(7 - rank) * 12.5}%` };
}

function reduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  const [foxLevel, setFoxLevel] = useState<GameDifficulty>('easy');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [foxAnim, setFoxAnim] = useState<FoxAnim | null>(null);
  const [foxExiting, setFoxExiting] = useState(false);
  const foxAwarded = useRef(false);
  const stickerHold = useRef<number | null>(null);
  const foxBoot = useRef(bootFox('easy'));

  const tortoiseIdle = characterArt('tortoise', 'idle');
  const foxIdle = characterArt('fox', 'idle');
  const pandaIdle = characterArt('panda', 'idle');
  const pandaCheer = characterArt('panda', 'cheer');

  const fen = mode === 'hotseat' || mode === 'fox'
    ? hotseat?.fen
    : playFen ?? (mode === 'moves' ? movesPrompt?.fen : capturePuzzle?.fen);

  const vsOver = mode === 'fox' && (hotseat?.status === 'won' || hotseat?.status === 'draw');
  const thinking = Boolean(
    mode === 'fox' &&
      hotseat &&
      hotseat.turn === 'b' &&
      hotseat.status === 'playing' &&
      !tippingKing &&
      !promo &&
      !foxAnim,
  );
  const foxBusy = thinking || Boolean(foxAnim);
  const foxWon = mode === 'fox' && hotseat?.status === 'won' && hotseat.winner === 'b';
  const foxPhase = foxAnim?.phase ?? (thinking ? 'think' : null);
  const foxOverlay = { mounted: thinking, visible: thinking && !foxExiting };

  const pieces = useMemo(() => (fen ? piecesFromFen(fen) : []), [fen]);

  const boardPieces = useMemo(() => {
    if (mode !== 'capture' || !capturePuzzle) return pieces;
    const visible = visibleCaptureSquares(capturePuzzle, captureStep);
    return pieces.filter((piece) => visible.has(piece.square));
  }, [mode, pieces, capturePuzzle, captureStep]);

  const currentCapture = capturePuzzle?.steps[captureStep];

  const legalHints = useMemo(() => {
    if ((mode === 'hotseat' || (mode === 'fox' && !foxBusy && !vsOver && !tippingKing && hotseat?.turn === 'w')) && selected && fen) {
      return legalMoves(fen, selected).map((m) => m.to);
    }
    if (!hintOn) return [] as Square[];
    if (mode === 'moves' && movesPrompt) return movesPrompt.legalTargets;
    return [] as Square[];
  }, [hintOn, mode, selected, fen, movesPrompt, foxBusy, vsOver, tippingKing, hotseat?.turn]);

  const captureTargets = useMemo(() => {
    if (!fen) return new Set<Square>();
    if ((mode === 'hotseat' || (mode === 'fox' && !foxBusy && !vsOver && !tippingKing && hotseat?.turn === 'w')) && selected) {
      return new Set(legalMoves(fen, selected).filter((m) => m.captured).map((m) => m.to));
    }
    if (mode === 'capture' && hintOn && currentCapture) {
      return new Set<Square>([currentCapture.to]);
    }
    return new Set<Square>();
  }, [fen, selected, mode, hintOn, currentCapture, foxBusy, vsOver, tippingKing, hotseat?.turn]);

  const dangerSquares = useMemo(() => {
    if ((mode !== 'hotseat' && mode !== 'fox') || !fen || tippingKing || vsOver) return [] as Square[];
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
    if (mode === 'fox' && hotseat) {
      const ownKing = pieces.find((p) => p.type === 'k' && p.color === 'w');
      const banner = hotseatBanner(
        hotseat,
        tippingKing?.mover ?? null,
        Boolean(ownKing && dangerSquares.includes(ownKing.square)),
      );
      if (banner.kind === 'won') return banner.side === 'w' ? t.chessGame.whiteWins : t.chessGame.foxWins;
      if (banner.kind === 'draw') return t.chessGame.draw;
      if (thinking) return `⚫ ${t.chessGame.foxThinking}`;
      if (banner.side === 'b') return t.chessGame.foxToMove;
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
    setFoxAnim(null);
    setFoxExiting(false);
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
      foxAwarded.current = false;
      setLastMove(null);
      const boot = bootFox(foxLevel);
      foxBoot.current = boot;
      setFoxLevel(boot.level);
      setHotseat(boot.state);
      setPlayFen(null);
      setMovesPrompt(null);
      setCapturePuzzle(null);
      settleFox(boot.state);
    }
  };

  const resetFoxBoard = (state = startHotseat()) => {
    foxAwarded.current = false;
    setLastMove(null);
    setSelected(null);
    setPromo(null);
    setTippingKing(null);
    setShowConfetti(false);
    setHintOn(false);
    setWonWhite([]);
    setWonBlack([]);
    setLocked(false);
    setFoxAnim(null);
    setFoxExiting(false);
    setHotseat(state);
  };

  useEffect(() => () => {
    if (stickerHold.current != null) window.clearTimeout(stickerHold.current);
  }, []);

  const settleFox = (state: HotseatState) => {
    if (state.status !== 'won' && state.status !== 'draw') return;
    if (foxAwarded.current) return;
    foxAwarded.current = true;
    onStarEarned?.(modeStars('fox'));
    if (state.status === 'won' && state.winner === 'w') {
      setShowConfetti(true);
      later(() => setShowConfetti(false), 900);
    }
    setLocked(false);
    if (stickerHold.current != null) window.clearTimeout(stickerHold.current);
    stickerHold.current = window.setTimeout(() => {
      stickerHold.current = null;
      onRoundComplete?.();
    }, FOX_STICKER_HOLD_MS);
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
    setFoxAnim(null);
    setFoxExiting(false);
    foxAwarded.current = false;
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
    if (locked || phase !== 'play' || !mode || promo || foxBusy) return;

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

    if (mode === 'fox' && hotseat && fen) {
      setLastMove(null);
      if (vsOver || tippingKing || hotseat.turn !== 'w') return;
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
      finishBoardMove(result, square, 'fox');
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
    kind: 'hotseat' | 'fox',
  ) => {
    setSelected(null);
    setFoxAnim(null);
    const afterTip = () => {
      recordCapture(result.captured);
      setHotseat(result.state);
      if (kind === 'fox') settleFox(result.state);
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
    if (kind === 'fox') settleFox(result.state);
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
    finishBoardMove(result, promo.to, mode === 'fox' ? 'fox' : 'hotseat');
  };

  const newHotseat = () => {
    playPop();
    if (mode === 'fox') {
      resetFoxBoard();
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

  const playAgainFox = () => {
    playPop();
    resetFoxBoard();
  };

  useEffect(() => {
    if (mode !== 'fox' || !hotseat || tippingKing || promo || foxAnim) return;
    if (hotseat.status !== 'playing' || hotseat.turn !== 'b') return;
    let cancelled = false;
    let timer = 0;
    const fenNow = hotseat.fen;
    const level: FoxLevel = foxLevel === 'medium' ? 'clever' : 'gentle';
    const boot = foxBoot.current;
    const pauseAt = boot.pauseAt;
    let choice: ReturnType<typeof chooseFoxMove> | null = null;
    let move: ReturnType<typeof findFoxMove> | undefined;

    const applyChoice = () => {
      if (cancelled || !choice) return;
      const result = applyMove(fenNow, choice.from, choice.to, choice.promotion ?? 'q');
      if (result.ok && !result.needsPromotion) {
        finishBoardMove(result, choice.to, 'fox');
      }
    };

    const startHop = (anim: FoxAnim, rook: { from: Square; to: Square }) => {
      setFoxAnim({ ...anim, visual: anim.to, castleRook: { ...rook, visual: rook.from, hopping: true } });
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setFoxAnim((current) =>
          current?.castleRook
            ? { ...current, castleRook: { ...current.castleRook, visual: rook.to, hopping: true } }
            : current,
        );
        timer = window.setTimeout(applyChoice, FOX_STEP_MS);
      }, 20);
    };

    const startSteps = (mover: NonNullable<ReturnType<typeof pieceAt>>, played: ChessMove) => {
      const path = foxPiecePath(played.from, played.to, mover.type, played.castle);
      const rook = played.castle ? castleRookHop(mover.color, played.castle) : undefined;
      const base: FoxAnim = {
        phase: 'move',
        from: played.from,
        to: played.to,
        visual: played.from,
        piece: { type: mover.type, color: mover.color },
        castleRook: rook ? { ...rook, visual: rook.from, hopping: false } : undefined,
      };
      if (pauseAt === 'move') {
        const mid = path[0] ?? played.to;
        setFoxAnim({ ...base, visual: mid });
        return;
      }
      let i = 0;
      const step = () => {
        if (cancelled) return;
        if (i >= path.length) {
          if (rook) startHop({ ...base, visual: played.to }, rook);
          else applyChoice();
          return;
        }
        setFoxAnim({ ...base, visual: path[i] });
        i += 1;
        timer = window.setTimeout(step, FOX_STEP_MS);
      };
      step();
    };

    const startHighlight = () => {
      if (cancelled || !choice) return;
      const mover = pieceAt(fenNow, choice.from);
      if (!mover || !move) {
        applyChoice();
        return;
      }
      const played = move;
      setLastMove({ from: choice.from, to: choice.to });
      setFoxAnim({
        phase: 'highlight',
        from: choice.from,
        to: choice.to,
        visual: choice.from,
        piece: { type: mover.type, color: mover.color },
        castleRook: played.castle
          ? { ...castleRookHop(mover.color, played.castle), visual: castleRookHop(mover.color, played.castle).from, hopping: false }
          : undefined,
      });
      if (pauseAt === 'highlight') return;
      timer = window.setTimeout(() => startSteps(mover, played), FOX_HIGHLIGHT_MS);
    };

    if (pauseAt === 'think') return;
    timer = window.setTimeout(() => {
      if (cancelled) return;
      const wait = boot.thinkMs ?? foxThinkMs({ plannedMs: plannedThinkMs(Math.random), searchMs: 0 });
      choice = chooseFoxMove(fenNow, level, Math.random);
      move = findFoxMove(fenNow, choice);
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const outMs = reduceMotion() ? 0 : FOX_OVERLAY_MS;
        setFoxExiting(true);
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setFoxExiting(false);
          startHighlight();
        }, outMs);
      }, wait);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // foxAnim is kept out of the deps so starting the highlight does not cancel this turn's timers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, hotseat, foxLevel, tippingKing, promo]);

  const cream = CREAM;

  const hotseatSide = hotseat
    ? hotseatBanner(hotseat, tippingKing?.mover ?? null, false).side
    : null;
  const sideToPlay = mode === 'capture' && capturePuzzle
    ? capturePuzzle.side
    : (mode === 'hotseat' || mode === 'fox') && hotseat
      ? hotseatSide
      : null;
  const showSideDot = Boolean(
    (mode === 'capture' && capturePuzzle) ||
    (mode === 'hotseat' && hotseat && hotseat.status !== 'draw') ||
    (mode === 'fox' && hotseat && !vsOver && !thinking && !foxAnim),
  );

  return (
    <div
      className="relative flex-1 flex flex-col items-center w-full select-none max-w-lg mx-auto px-3 pt-2 pb-3 gap-2"
      data-testid="chess-root"
      data-phase={phase}
      data-mode={mode ?? 'pick'}
      data-thinking={thinking ? 'true' : 'false'}
      data-fox-phase={foxPhase ?? 'idle'}
    >
      {showConfetti && !foxWon && <GameConfetti pieces={120} />}

      <div className="w-full flex items-center gap-2 min-h-[52px]">
        {tortoiseIdle && mode !== 'fox' && (
          <img
            src={tortoiseIdle}
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
          className={`flex-1 text-center text-lg font-black leading-tight ${thinking ? 'whitespace-nowrap' : ''}`}
          style={{ color: INK }}
          data-testid="chess-prompt"
        >
          {promptText}
        </p>
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
              ['fox', t.chessGame.playVsFox],
            ] as const).map(([id, label]) => (
              <KidButton
                key={id}
                color="green"
                size="lg"
                className="w-full min-h-24"
                data-testid={`chess-mode-${id}`}
                aria-label={id === 'fox' ? label : undefined}
                onClick={() => startMode(id)}
              >
                {id === 'fox' && foxIdle ? (
                  <img
                    src={foxIdle}
                    alt=""
                    className="h-[72px] w-[72px] object-contain pointer-events-none"
                  />
                ) : (
                  label
                )}
              </KidButton>
            ))}
          </div>
          <div className="w-full flex flex-col gap-2" data-testid="chess-fox-levels">
            <p
              className="w-full text-center text-lg font-black leading-tight"
              style={{ color: INK }}
              data-testid="chess-fox-level-label"
            >
              {t.chessGame.foxLevel}
            </p>
            <DifficultySelector
              selected={foxLevel}
              options={['easy', 'medium']}
              locked={null}
              labels={{ easy: t.chessGame.levelGentle, medium: t.chessGame.levelClever }}
              onChange={setFoxLevel}
            />
          </div>
        </div>
      )}

      {phase === 'play' && fen && (
        <>
          {(mode === 'hotseat' || mode === 'fox') && (
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
            lastMove={mode === 'fox' ? lastMove : null}
            foxAnim={mode === 'fox' ? foxAnim : null}
            locked={foxBusy}
            overlay={foxOverlay.mounted ? (
              <>
                <div
                  className="chess-fox-dim pointer-events-none absolute inset-0 z-[4] rounded-[0.7rem]"
                  data-testid="chess-fox-dim"
                  data-visible={foxOverlay.visible ? 'true' : 'false'}
                />
                <div
                  className="chess-fox-overlay pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-visible"
                  data-testid="chess-fox-overlay"
                  data-visible={foxOverlay.visible ? 'true' : 'false'}
                >
                  <div className="relative w-[60%] aspect-square">
                    <div
                      className="absolute overflow-visible"
                      style={{ left: '-40%', top: '-18%', width: '80%', height: '60%' }}
                    >
                      <FoxThoughtBubble />
                    </div>
                    <img
                      src={FOX_THINK_SRC}
                      alt=""
                      className="h-full w-full object-contain"
                      data-testid="chess-fox"
                    />
                  </div>
                </div>
              </>
            ) : null}
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
            {mode === 'fox' && !vsOver && (
              <ConfirmWipeButton
                label={t.chessGame.newGame}
                confirmLabel={t.chessGame.newGameConfirm}
                size="md"
                className="min-h-24 min-w-[6.5rem]"
                data-testid="chess-new-game"
                onConfirm={newHotseat}
              />
            )}
            {mode === 'fox' && vsOver && (
              <KidButton
                color="green"
                size="md"
                className="min-h-24 min-w-[6.5rem]"
                data-testid="chess-play-again"
                onClick={playAgainFox}
              >
                {t.chessGame.playAgain}
              </KidButton>
            )}
          </div>

          {mode !== 'fox' && pandaIdle && (
            <img
              src={hotseat?.status === 'won' ? (pandaCheer ?? pandaIdle) : pandaIdle}
              alt=""
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-2 h-[76px] w-[76px] object-contain short:hidden tiny:hidden"
              data-testid="chess-panda"
            />
          )}

          {mode === 'fox' && foxIdle && (!foxOverlay.mounted || foxExiting) && (
            <div
              className="pointer-events-none absolute bottom-2 right-2"
              data-testid="chess-fox-corner"
            >
              <img
                src={foxIdle}
                alt=""
                className="h-[72px] w-[72px] object-contain"
                data-testid="chess-fox"
              />
            </div>
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
            count: taken.filter((piece) => piece.type === type).length,
            color: match?.color,
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
  foxAnim,
  locked,
  overlay,
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
  foxAnim: FoxAnim | null;
  locked: boolean;
  overlay?: ReactNode;
  onSquare: (s: Square) => void;
}) {
  const pieceMap = useMemo(() => {
    const m = new Map<Square, (typeof pieces)[number]>();
    for (const p of pieces) m.set(p.square, p);
    return m;
  }, [pieces]);

  const hintSet = useMemo(() => new Set(hints), [hints]);
  const hideSquares = new Set<Square>();
  if (foxAnim) hideSquares.add(foxAnim.from);
  if (foxAnim?.castleRook?.hopping) hideSquares.add(foxAnim.castleRook.from);

  // Rank 8 at top (white's view); files a-h left to right.
  const ranks = [...RANKS].reverse();

  return (
    <div className="w-full max-w-[min(100%,360px)] mx-auto" data-testid="chess-board" data-fen={fen} data-locked={locked ? 'true' : 'false'}>
      <div
        className="relative w-full aspect-square overflow-visible rounded-[1.1rem] border-4 p-[3px]"
        style={{ borderColor: INK, backgroundColor: COAL, boxShadow: hardShadow(5, 6) }}
      >
        <div className={`relative w-full h-full${locked ? ' pointer-events-none' : ''}`}>
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full overflow-hidden rounded-[0.7rem]">
            {ranks.map((_, rankIdx) =>
              [...FILES].map((_, fileIdx) => {
                const square = sq(fileIdx, 7 - rankIdx);
                const dark = (fileIdx + (7 - rankIdx)) % 2 === 0;
                const piece = hideSquares.has(square) ? undefined : pieceMap.get(square);
                const isSelected = selected === square;
                const isHint = hintSet.has(square);
                const isCapture = captureTargets.has(square);
                const isShake = shake === square;
                const isDanger = dangerSquares.includes(square);
                const isTip = tippingKing?.square === square;
                const isFoxHighlight = foxAnim?.phase === 'highlight' && foxAnim.from === square;
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
                    {isFoxHighlight && (
                      <span
                        className="absolute inset-[1px] rounded-sm pointer-events-none"
                        style={{ boxShadow: `inset 0 0 0 3px ${LEAF}` }}
                        data-testid="chess-fox-highlight"
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
          {foxAnim && (
            <div className="absolute inset-0 pointer-events-none z-[3] overflow-hidden rounded-[0.7rem]">
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: '12.5%',
                  height: '12.5%',
                  ...squareOffset(foxAnim.visual),
                  transition: 'left 100ms linear, top 100ms linear',
                  transform: foxAnim.phase === 'highlight' ? 'scale(1.1)' : 'none',
                  transformOrigin: 'center',
                }}
                data-testid="chess-moving-piece"
              >
                <img
                  src={pieceSrc(foxAnim.piece.color, foxAnim.piece.type)}
                  alt=""
                  className="h-[84%] w-[84%] object-contain"
                  draggable={false}
                />
              </div>
              {foxAnim.castleRook?.hopping && (
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    width: '12.5%',
                    height: '12.5%',
                    ...squareOffset(foxAnim.castleRook.visual),
                    transition: 'left 100ms linear, top 100ms linear',
                  }}
                  data-testid="chess-moving-rook"
                >
                  <img
                    src={pieceSrc(foxAnim.piece.color, 'r')}
                    alt=""
                    className="h-[84%] w-[84%] object-contain"
                    draggable={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        {overlay}
      </div>
      <div className="mt-1 flex justify-between px-1 text-[12px] font-extrabold" style={{ color: INK_SOFT }} aria-hidden>
        {[...FILES].map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
    </div>
  );
}
