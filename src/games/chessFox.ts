import type { Color, PieceSymbol, Square, ChessMove, PlayState } from './chessLogic';
import { applyMove, legalMoves, parseSq, piecesFromFen, snapshotFromFen, sq } from './chessLogic';

export type FoxLevel = 'gentle' | 'clever';

export type FoxChoice = {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
};

export const THINK_MIN_MS = 1000;
export const THINK_MAX_MS = 3000;
export const THINK_CAP_MS = THINK_MAX_MS;
export const FOX_HIGHLIGHT_MS = 500;
export const FOX_STEP_MS = 100;
/** Hold the Logic sticker popup until the end line has been visible this long. */
export const FOX_STICKER_HOLD_MS = 1500;


const CLOSE_PAWN = 1;
const KING_TAKEN_SCORE = 1000;
const KING_LEFT_OPEN_SCORE = -1000;
const MATERIAL: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function plannedThinkMs(rng: () => number, minMs = THINK_MIN_MS, maxMs = THINK_MAX_MS): number {
  const u = clampUnit(rng());
  return minMs + u * (maxMs - minMs);
}

/** Wait long enough to feel like thinking, but never longer than the cap. */
export function foxThinkMs({
  plannedMs,
  searchMs,
  capMs = THINK_CAP_MS,
}: {
  plannedMs: number;
  searchMs: number;
  capMs?: number;
}): number {
  return Math.min(capMs, Math.max(THINK_MIN_MS, plannedMs, searchMs));
}

/** Squares the piece visits after `from`, including the destination. */
export function foxPiecePath(
  from: Square,
  to: Square,
  piece: PieceSymbol,
  castle?: 'k' | 'q',
): Square[] {
  if (castle) return slidePath(from, to);
  if (piece === 'n' || piece === 'p' || piece === 'k') return [to];
  return slidePath(from, to);
}

export function castleRookHop(color: Color, castle: 'k' | 'q'): { from: Square; to: Square } {
  const rank = color === 'w' ? '1' : '8';
  return castle === 'k'
    ? { from: `h${rank}` as Square, to: `f${rank}` as Square }
    : { from: `a${rank}` as Square, to: `d${rank}` as Square };
}

function slidePath(from: Square, to: Square): Square[] {
  const a = parseSq(from);
  const b = parseSq(to);
  const df = b.file - a.file;
  const dr = b.rank - a.rank;
  const dist = Math.max(Math.abs(df), Math.abs(dr));
  if (dist === 0) return [];
  const sf = Math.sign(df);
  const sr = Math.sign(dr);
  if (!(df === 0 || dr === 0 || Math.abs(df) === Math.abs(dr))) return [to];
  const path: Square[] = [];
  for (let i = 1; i <= dist; i += 1) path.push(sq(a.file + sf * i, a.rank + sr * i));
  return path;
}

export function chooseFoxMove(fen: string, level: FoxLevel, rng: () => number): FoxChoice {
  const moves = legalMoves(fen);
  if (moves.length === 0) throw new Error(`fox has no legal moves in ${fen}`);
  const chosen = level === 'clever' ? chooseClever(fen, moves, rng) : chooseGentle(fen, moves, rng);
  return toChoice(chosen);
}

export function findFoxMove(fen: string, choice: FoxChoice): ChessMove | undefined {
  return legalMoves(fen).find((move) =>
    move.from === choice.from
    && move.to === choice.to
    && (move.promotion ?? 'q') === (choice.promotion ?? 'q')
  );
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

function toChoice(move: ChessMove): FoxChoice {
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
