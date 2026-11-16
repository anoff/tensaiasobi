import type { Color, PieceSymbol, Square, ChessMove, PlayState } from './chessLogic';
import { applyMove, legalMoves, piecesFromFen, snapshotFromFen } from './chessLogic';

export type TortoiseLevel = 'gentle' | 'clever';

export type TortoiseChoice = {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
};

export const THINK_MIN_MS = 700;
export const THINK_MAX_MS = 1400;
export const THINK_CAP_MS = 2000;
const CLOSE_PAWN = 1;
const KING_TAKEN_SCORE = 1000;
const KING_LEFT_OPEN_SCORE = -1000;
const MATERIAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function plannedThinkMs(rng: () => number, minMs = THINK_MIN_MS, maxMs = THINK_MAX_MS): number {
  const u = clampUnit(rng());
  return minMs + u * (maxMs - minMs);
}

/** Wait long enough to feel like thinking, but never longer than the cap. */
export function tortoiseThinkMs({
  plannedMs,
  searchMs,
  capMs = THINK_CAP_MS,
}: {
  plannedMs: number;
  searchMs: number;
  capMs?: number;
}): number {
  return Math.min(capMs, Math.max(plannedMs, searchMs));
}

export function chooseTortoiseMove(fen: string, level: TortoiseLevel, rng: () => number): TortoiseChoice {
  const moves = legalMoves(fen);
  if (moves.length === 0) throw new Error(`tortoise has no legal moves in ${fen}`);
  const chosen = level === 'clever' ? chooseClever(fen, moves, rng) : chooseGentle(fen, moves, rng);
  return toChoice(chosen);
}

function chooseGentle(fen: string, moves: ChessMove[], rng: () => number): ChessMove {
  const kingTakes = moves.filter(takesKing);
  // About 1 in 4: first rng draw decides whether to take an open king.
  if (kingTakes.length > 0 && rng() < 0.25) return pick(kingTakes, rng);

  const nonKing = moves.filter((move) => !takesKing(move));
  const pool = nonKing.length > 0 ? nonKing : moves;
  const free = pool.filter((move) => isFreeCapture(fen, move));
  if (free.length > 0 && rng() < 0.5) return pick(free, rng);
  return pick(pool, rng);
}

function chooseClever(fen: string, moves: ChessMove[], rng: () => number): ChessMove {
  const kingTakes = moves.filter(takesKing);
  if (kingTakes.length > 0) return pick(kingTakes, rng);

  const candidates = preferQueenPromotion(moves);
  const scored = candidates.map((move) => ({ move, score: scoreMove(fen, move) }));
  const best = Math.max(...scored.map((row) => row.score));
  const close = scored.filter((row) => row.score >= best - CLOSE_PAWN).map((row) => row.move);
  return pick(close, rng);
}

function scoreMove(fen: string, move: ChessMove): number {
  const side = snapshotFromFen(fen).turn;
  const after = mustApply(fen, move);
  if (after.status === 'won' && after.winner === side) return KING_TAKEN_SCORE;
  if (after.status === 'draw') return 0;
  if (kingIsOpen(after.fen)) return KING_LEFT_OPEN_SCORE;

  let worst = Infinity;
  for (const reply of legalMoves(after.fen)) {
    const next = mustApply(after.fen, reply);
    let score: number;
    if (next.status === 'won' && next.winner === side) score = KING_TAKEN_SCORE;
    else if (next.status === 'won') score = KING_LEFT_OPEN_SCORE;
    else score = materialFor(next.fen, side);
    if (score < worst) worst = score;
  }
  return worst === Infinity ? materialFor(after.fen, side) : worst;
}

function materialFor(fen: string, side: Color): number {
  let score = 0;
  for (const piece of piecesFromFen(fen)) {
    const value = MATERIAL[piece.type];
    score += piece.color === side ? value : -value;
  }
  return score;
}

function takesKing(move: ChessMove): boolean {
  return move.captured === 'k';
}

function kingIsOpen(fen: string): boolean {
  return legalMoves(fen).some(takesKing);
}

/** A capture the opponent cannot recapture on the same square — a hanging piece. */
function isFreeCapture(fen: string, move: ChessMove): boolean {
  if (!move.captured || takesKing(move)) return false;
  const after = mustApply(fen, move);
  return !legalMoves(after.fen).some((reply) => reply.to === move.to && reply.captured);
}

function preferQueenPromotion(moves: ChessMove[]): ChessMove[] {
  const queens = moves.filter((move) => !move.promotion || move.promotion === 'q');
  return queens.length > 0 ? queens : moves;
}

function mustApply(fen: string, move: ChessMove): PlayState {
  const result = applyMove(fen, move.from, move.to, move.promotion ?? 'q');
  if (!result.ok || result.needsPromotion) throw new Error(`illegal ${move.from}->${move.to} in ${fen}`);
  return result.state;
}

function toChoice(move: ChessMove): TortoiseChoice {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
}

function pick<T>(items: T[], rng: () => number): T {
  const index = Math.min(items.length - 1, Math.floor(clampUnit(rng()) * items.length));
  return items[index];
}

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(0.999999, Math.max(0, value));
}
