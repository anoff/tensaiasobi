import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';

export type ChessMode = 'moves' | 'capture' | 'hotseat';
export type PieceKind = PieceSymbol;

export interface BoardPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

export interface MovesPrompt {
  id: string;
  piece: PieceSymbol;
  color: Color;
  from: Square;
  fen: string;
  legalTargets: Square[];
}

export interface CaptureStep {
  from: Square;
  to: Square;
}

export interface CapturePuzzle {
  id: string;
  fen: string;
  /** Side the child plays. */
  side: Color;
  /** 2–3 successive captures by `side` (no opponent replies). */
  steps: CaptureStep[];
}

export const FILES = 'abcdefgh';
export const RANKS = '12345678';

export function sq(file: number, rank: number): Square {
  return `${FILES[file]}${RANKS[rank]}` as Square;
}

export function parseSq(s: Square): { file: number; rank: number } {
  return { file: FILES.indexOf(s[0]), rank: RANKS.indexOf(s[1]) };
}

export function piecesFromFen(fen: string): BoardPiece[] {
  const chess = new Chess(fen);
  const out: BoardPiece[] = [];
  for (const file of FILES) {
    for (const rank of RANKS) {
      const square = `${file}${rank}` as Square;
      const p = chess.get(square);
      if (p) out.push({ square, type: p.type, color: p.color });
    }
  }
  return out;
}

export function legalTargets(fen: string, from: Square): Square[] {
  const chess = new Chess(fen);
  return chess.moves({ square: from, verbose: true }).map((m) => m.to);
}

export function applyMove(fen: string, from: Square, to: Square): string {
  const chess = new Chess(fen);
  const move = chess.move({ from, to });
  if (!move) throw new Error(`illegal ${from}->${to} in ${fen}`);
  return chess.fen();
}

/** Apply a capture and keep `side` to move so a sequence can continue without an opponent reply. */
export function applyCaptureMove(fen: string, from: Square, to: Square, side: Color): string {
  const chess = new Chess(fen);
  const move = chess.move({ from, to });
  if (!move?.captured) throw new Error(`illegal capture ${from}->${to} in ${fen}`);
  const natural = chess.fen();
  const parts = natural.split(' ');
  parts[1] = side;
  const flipped = parts.join(' ');
  try {
    // Invalid if the opposite king is left in check while `side` still moves (often the last take).
    new Chess(flipped);
    return flipped;
  } catch {
    return natural;
  }
}

function assertLegal(fen: string, from: Square): Square[] {
  const targets = legalTargets(fen, from);
  if (targets.length === 0) throw new Error(`no legal moves from ${from} in ${fen}`);
  return targets;
}

/** Easy piece-moves: one piece (optional blocker), no castling/en passant/promotion. */
const MOVES_POOL: MovesPrompt[] = [
  (() => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const from = 'e2' as Square;
    return { id: 'pawn-e2', piece: 'p', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/3P4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'pawn-d5', piece: 'p', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/3R4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'rook-open', piece: 'r', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    // Rook blocked north by a friendly pawn.
    const fen = '4k3/8/3P4/3R4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'rook-block', piece: 'r', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/3B4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'bishop-open', piece: 'b', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/4P3/3B4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'bishop-block', piece: 'b', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'knight-d5', piece: 'n', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/8/8/5N2/8/4K3 w - - 0 1';
    const from = 'f3' as Square;
    return { id: 'knight-f3', piece: 'n', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/3Q4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'queen-open', piece: 'q', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/3P4/3Q4/8/8/8/4K3 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'queen-block', piece: 'q', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';
    const from = 'e1' as Square;
    return { id: 'king-e1', piece: 'k', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
  (() => {
    const fen = '4k3/8/8/3K4/8/8/8/8 w - - 0 1';
    const from = 'd5' as Square;
    return { id: 'king-d5', piece: 'k', color: 'w', from, fen, legalTargets: assertLegal(fen, from) };
  })(),
];

const PIECE_CYCLE: PieceSymbol[] = ['p', 'r', 'n', 'b', 'q', 'k'];

export function nextMovesPrompt(prevId: string | null, step: number): MovesPrompt {
  const want = PIECE_CYCLE[step % PIECE_CYCLE.length];
  const pool = MOVES_POOL.filter((p) => p.piece === want);
  const pick = pool.find((p) => p.id !== prevId) ?? pool[0] ?? MOVES_POOL[0];
  return pick;
}

export function gradeMovesTap(prompt: MovesPrompt, to: Square): 'hit' | 'miss' {
  return prompt.legalTargets.includes(to) ? 'hit' : 'miss';
}

/**
 * Capture puzzles: a short sequence of 2–3 captures by the same side.
 * Child plays the side to move; no opponent replies between takes.
 */
export const CAPTURE_PUZZLES: CapturePuzzle[] = [
  {
    id: 'queen-file-two',
    fen: '4k3/3p4/8/3p4/8/8/8/3QK3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'd1', to: 'd5' },
      { from: 'd5', to: 'd7' },
    ],
  },
  {
    id: 'queen-file-three',
    fen: '4k3/3p4/8/3p4/8/3p4/8/3QK3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'd1', to: 'd3' },
      { from: 'd3', to: 'd5' },
      { from: 'd5', to: 'd7' },
    ],
  },
  {
    id: 'rook-file-two',
    fen: '4k3/3p4/8/3p4/8/8/8/3RK3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'd1', to: 'd5' },
      { from: 'd5', to: 'd7' },
    ],
  },
  {
    id: 'bishop-diag-two',
    fen: '4k3/8/8/6p1/8/4n3/8/2B1K3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'c1', to: 'e3' },
      { from: 'e3', to: 'g5' },
    ],
  },
  {
    id: 'knight-two',
    fen: '4k3/3p4/8/4p3/8/5N2/8/4K3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'f3', to: 'e5' },
      { from: 'e5', to: 'd7' },
    ],
  },
  {
    id: 'pawn-two',
    fen: '4k3/8/2p1p3/3p4/4P3/8/8/4K3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'e4', to: 'd5' },
      { from: 'd5', to: 'c6' },
    ],
  },
];

// Validate each step is a legal capture after previous steps are applied.
for (const p of CAPTURE_PUZZLES) {
  if (p.steps.length < 2 || p.steps.length > 3) {
    throw new Error(`bad capture puzzle ${p.id}: need 2–3 steps`);
  }
  let fen = p.fen;
  for (const step of p.steps) {
    const chess = new Chess(fen);
    const move = chess.moves({ square: step.from, verbose: true }).find((m) => m.to === step.to && Boolean(m.captured));
    if (!move) {
      throw new Error(`bad capture puzzle ${p.id}: ${step.from}->${step.to} not a capture in ${fen}`);
    }
    fen = applyCaptureMove(fen, step.from, step.to, p.side);
  }
}

/** Squares whose pieces should be drawn in Capture: the capturer and remaining targets. */
export function visibleCaptureSquares(puzzle: CapturePuzzle, stepIndex: number): Set<Square> {
  const visible = new Set<Square>();
  if (puzzle.steps.length === 0) return visible;
  if (stepIndex >= puzzle.steps.length) {
    visible.add(puzzle.steps[puzzle.steps.length - 1].to);
    return visible;
  }
  const idx = Math.max(0, stepIndex);
  visible.add(puzzle.steps[idx].from);
  for (let i = idx; i < puzzle.steps.length; i++) visible.add(puzzle.steps[i].to);
  return visible;
}

export function nextCapturePuzzle(prevId: string | null): CapturePuzzle {
  const pool = CAPTURE_PUZZLES.filter((p) => p.id !== prevId);
  return pool[Math.floor(Math.random() * pool.length)] ?? CAPTURE_PUZZLES[0];
}


export type HotseatStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export interface HotseatState {
  fen: string;
  turn: Color;
  status: HotseatStatus;
  winner: Color | null;
}

export function startHotseat(): HotseatState {
  const chess = new Chess();
  return snapshot(chess);
}

export function snapshot(chess: Chess): HotseatState {
  let status: HotseatStatus = 'playing';
  let winner: Color | null = null;
  if (chess.isCheckmate()) {
    status = 'checkmate';
    winner = chess.turn() === 'w' ? 'b' : 'w';
  } else if (chess.isStalemate()) {
    status = 'stalemate';
  } else if (chess.isDraw()) {
    status = 'draw';
  } else if (chess.inCheck()) {
    status = 'check';
  }
  return { fen: chess.fen(), turn: chess.turn(), status, winner };
}

export function hotseatMoves(fen: string, from: Square) {
  const chess = new Chess(fen);
  return chess.moves({ square: from, verbose: true });
}

export type CapturedPiece = { type: PieceSymbol; color: Color };

export function tryHotseatMove(
  fen: string,
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
): { ok: true; state: HotseatState; needsPromotion: false; captured: CapturedPiece | null } | { ok: true; state: HotseatState; needsPromotion: true; from: Square; to: Square } | { ok: false } {
  const chess = new Chess(fen);
  const options = chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
  if (options.length === 0) return { ok: false };
  const needsPromo = options.some((m) => m.promotion);
  if (needsPromo && !promotion) {
    return { ok: true, state: snapshot(chess), needsPromotion: true, from, to };
  }
  const move = chess.move({ from, to, promotion: promotion ?? undefined });
  if (!move) return { ok: false };
  const captured: CapturedPiece | null = move.captured
    ? { type: move.captured, color: move.color === 'w' ? 'b' : 'w' }
    : null;
  return { ok: true, state: snapshot(chess), needsPromotion: false, captured };
}

export function pieceAt(fen: string, square: Square): BoardPiece | null {
  const chess = new Chess(fen);
  const p = chess.get(square);
  return p ? { square, type: p.type, color: p.color } : null;
}

export function modeStars(mode: ChessMode): number {
  return mode === 'moves' ? 2 : mode === 'capture' ? 3 : 4;
}

/** Exported for tests. */
export const _test = { MOVES_POOL, CAPTURE_PUZZLES };
