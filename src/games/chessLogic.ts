export type Color = 'w' | 'b';
export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'}`;

export type ChessMode = 'moves' | 'capture' | 'hotseat';
export type PieceKind = PieceSymbol;

export interface BoardPiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

export interface ChessMove {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
  captured: PieceSymbol | null;
  castle?: 'k' | 'q';
  enPassant?: boolean;
}

export type PlayStatus = 'playing' | 'won' | 'draw';

export interface PlayState {
  fen: string;
  turn: Color;
  status: PlayStatus;
  winner: Color | null;
}

export type HotseatStatus = PlayStatus;
export type HotseatState = PlayState;

/** Banner for 2-player: during a king tip-over, keep showing the mover, not the loser. */
export function hotseatBanner(
  state: Pick<PlayState, 'status' | 'turn' | 'winner'>,
  tippingMover: Color | null,
  ownKingInDanger: boolean,
): { kind: 'won' | 'draw' | 'watchKing' | 'toMove'; side: Color } {
  if (state.status === 'won') {
    return { kind: 'won', side: state.winner ?? state.turn };
  }
  if (state.status === 'draw') {
    return { kind: 'draw', side: state.turn };
  }
  if (tippingMover) {
    return { kind: 'toMove', side: tippingMover };
  }
  if (ownKingInDanger) {
    return { kind: 'watchKing', side: state.turn };
  }
  return { kind: 'toMove', side: state.turn };
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

export type CapturedPiece = { type: PieceSymbol; color: Color };

export const FILES = 'abcdefgh';
export const RANKS = '12345678';
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const PROMOTIONS: PieceSymbol[] = ['q', 'r', 'b', 'n'];
const KNIGHT_DELTAS: Array<[number, number]> = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];
const KING_DELTAS: Array<[number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];
const BISHOP_DELTAS: Array<[number, number]> = [
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];
const ROOK_DELTAS: Array<[number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

interface Position {
  board: (BoardPiece | null)[];
  turn: Color;
  castling: string;
  ep: Square | null;
  halfmove: number;
  fullmove: number;
}

export function sq(file: number, rank: number): Square {
  return `${FILES[file]}${RANKS[rank]}` as Square;
}

export function parseSq(s: Square): { file: number; rank: number } {
  return { file: FILES.indexOf(s[0]), rank: RANKS.indexOf(s[1]) };
}

function idx(file: number, rank: number): number {
  return rank * 8 + file;
}

function other(color: Color): Color {
  return color === 'w' ? 'b' : 'w';
}

function inBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function parseFen(fen: string): Position {
  const parts = fen.trim().split(/\s+/);
  const board: (BoardPiece | null)[] = Array(64).fill(null);
  const ranks = (parts[0] ?? '').split('/');
  if (ranks.length !== 8) throw new Error(`bad fen ${fen}`);
  for (let r = 0; r < 8; r++) {
    const rank = 7 - r;
    let file = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch);
        continue;
      }
      const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
      const type = ch.toLowerCase() as PieceSymbol;
      if (!'pnbrqk'.includes(type) || file > 7) throw new Error(`bad fen ${fen}`);
      const square = sq(file, rank);
      board[idx(file, rank)] = { square, type, color };
      file += 1;
    }
  }
  const turn: Color = parts[1] === 'b' ? 'b' : 'w';
  const castling = !parts[2] || parts[2] === '-' ? '' : parts[2];
  const ep = !parts[3] || parts[3] === '-' ? null : (parts[3] as Square);
  const halfmove = Number(parts[4] ?? 0);
  const fullmove = Number(parts[5] ?? 1);
  return { board, turn, castling, ep, halfmove, fullmove };
}

function fenOf(pos: Position): string {
  const ranks: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const piece = pos.board[idx(f, r)];
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        row += String(empty);
        empty = 0;
      }
      const ch = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
      row += ch;
    }
    if (empty) row += String(empty);
    ranks.push(row);
  }
  const castling = pos.castling || '-';
  const ep = pos.ep ?? '-';
  return `${ranks.join('/')} ${pos.turn} ${castling} ${ep} ${pos.halfmove} ${pos.fullmove}`;
}

function at(pos: Position, file: number, rank: number): BoardPiece | null {
  return inBoard(file, rank) ? pos.board[idx(file, rank)] : null;
}

function findKing(pos: Position, color: Color): Square | null {
  for (const piece of pos.board) {
    if (piece?.type === 'k' && piece.color === color) return piece.square;
  }
  return null;
}

function pushMove(
  moves: ChessMove[],
  from: Square,
  to: Square,
  captured: PieceSymbol | null,
  extra: Partial<ChessMove> = {},
): void {
  moves.push({ from, to, captured, ...extra });
}

function addPawnMoves(pos: Position, from: Square, color: Color, moves: ChessMove[]): void {
  const { file, rank } = parseSq(from);
  const dir = color === 'w' ? 1 : -1;
  const start = color === 'w' ? 1 : 6;
  const last = color === 'w' ? 7 : 0;
  const one = rank + dir;
  if (inBoard(file, one) && !at(pos, file, one)) {
    if (one === last) {
      for (const promotion of PROMOTIONS) pushMove(moves, from, sq(file, one), null, { promotion });
    } else {
      pushMove(moves, from, sq(file, one), null);
      const two = rank + dir * 2;
      if (rank === start && inBoard(file, two) && !at(pos, file, two)) {
        pushMove(moves, from, sq(file, two), null);
      }
    }
  }
  for (const df of [-1, 1]) {
    const f = file + df;
    const t = one;
    if (!inBoard(f, t)) continue;
    const target = at(pos, f, t);
    const to = sq(f, t);
    if (target && target.color !== color) {
      if (t === last) {
        for (const promotion of PROMOTIONS) pushMove(moves, from, to, target.type, { promotion });
      } else {
        pushMove(moves, from, to, target.type);
      }
    } else if (!target && pos.ep === to) {
      pushMove(moves, from, to, 'p', { enPassant: true });
    }
  }
}

function addStepMoves(
  pos: Position,
  from: Square,
  color: Color,
  deltas: Array<[number, number]>,
  moves: ChessMove[],
): void {
  const { file, rank } = parseSq(from);
  for (const [df, dr] of deltas) {
    const f = file + df;
    const r = rank + dr;
    if (!inBoard(f, r)) continue;
    const target = at(pos, f, r);
    if (target && target.color === color) continue;
    pushMove(moves, from, sq(f, r), target?.type ?? null);
  }
}

function addSlideMoves(
  pos: Position,
  from: Square,
  color: Color,
  deltas: Array<[number, number]>,
  moves: ChessMove[],
): void {
  const { file, rank } = parseSq(from);
  for (const [df, dr] of deltas) {
    let f = file + df;
    let r = rank + dr;
    while (inBoard(f, r)) {
      const target = at(pos, f, r);
      if (!target) {
        pushMove(moves, from, sq(f, r), null);
      } else {
        if (target.color !== color) pushMove(moves, from, sq(f, r), target.type);
        break;
      }
      f += df;
      r += dr;
    }
  }
}

function addCastling(pos: Position, from: Square, color: Color, moves: ChessMove[]): void {
  const home = color === 'w' ? 0 : 7;
  const { file, rank } = parseSq(from);
  if (file !== 4 || rank !== home) return;
  const rights = pos.castling;
  const kingRight = color === 'w' ? 'K' : 'k';
  const queenRight = color === 'w' ? 'Q' : 'q';
  if (rights.includes(kingRight) && !at(pos, 5, home) && !at(pos, 6, home)) {
    const rook = at(pos, 7, home);
    if (rook?.type === 'r' && rook.color === color) {
      pushMove(moves, from, sq(6, home), null, { castle: 'k' });
    }
  }
  if (rights.includes(queenRight) && !at(pos, 3, home) && !at(pos, 2, home) && !at(pos, 1, home)) {
    const rook = at(pos, 0, home);
    if (rook?.type === 'r' && rook.color === color) {
      pushMove(moves, from, sq(2, home), null, { castle: 'q' });
    }
  }
}

function movesFrom(pos: Position, from: Square): ChessMove[] {
  const { file, rank } = parseSq(from);
  const piece = at(pos, file, rank);
  if (!piece || piece.color !== pos.turn) return [];
  const moves: ChessMove[] = [];
  if (piece.type === 'p') addPawnMoves(pos, from, piece.color, moves);
  else if (piece.type === 'n') addStepMoves(pos, from, piece.color, KNIGHT_DELTAS, moves);
  else if (piece.type === 'b') addSlideMoves(pos, from, piece.color, BISHOP_DELTAS, moves);
  else if (piece.type === 'r') addSlideMoves(pos, from, piece.color, ROOK_DELTAS, moves);
  else if (piece.type === 'q') {
    addSlideMoves(pos, from, piece.color, BISHOP_DELTAS, moves);
    addSlideMoves(pos, from, piece.color, ROOK_DELTAS, moves);
  } else if (piece.type === 'k') {
    addStepMoves(pos, from, piece.color, KING_DELTAS, moves);
    addCastling(pos, from, piece.color, moves);
  }
  return moves;
}

/** Movement-only destinations for `from`, or every move for the side to play. */
export function legalMoves(fen: string, from?: Square): ChessMove[] {
  const pos = parseFen(fen);
  if (from) return movesFrom(pos, from);
  const all: ChessMove[] = [];
  for (const piece of pos.board) {
    if (piece && piece.color === pos.turn) all.push(...movesFrom(pos, piece.square));
  }
  return all;
}

export function legalTargets(fen: string, from: Square): Square[] {
  return [...new Set(legalMoves(fen, from).map((m) => m.to))];
}

function pawnAttacks(color: Color, file: number, rank: number, target: Square): boolean {
  const dir = color === 'w' ? 1 : -1;
  const t = parseSq(target);
  return t.rank === rank + dir && (t.file === file - 1 || t.file === file + 1);
}

export function squareAttackedBy(fen: string, square: Square, by: Color): boolean {
  const pos = parseFen(fen);
  const target = parseSq(square);
  for (const piece of pos.board) {
    if (!piece || piece.color !== by) continue;
    const { file, rank } = parseSq(piece.square);
    if (piece.type === 'p') {
      if (pawnAttacks(by, file, rank, square)) return true;
      continue;
    }
    const probe: Position = { ...pos, turn: by };
    const hits = movesFrom(probe, piece.square);
    if (hits.some((m) => m.to === square && !m.castle)) return true;
    void target;
  }
  return false;
}

/** Squares of kings that a movement-rule capture could take on the next turn. */
export function kingsInDanger(fen: string): Square[] {
  const pos = parseFen(fen);
  const out: Square[] = [];
  for (const color of ['w', 'b'] as const) {
    const king = findKing(pos, color);
    if (king && squareAttackedBy(fen, king, other(color))) out.push(king);
  }
  return out;
}

function stripCastling(castling: string, drop: string): string {
  return [...castling].filter((ch) => !drop.includes(ch)).join('');
}

function applyOn(pos: Position, move: ChessMove): Position {
  const next: Position = {
    board: pos.board.map((p) => (p ? { ...p } : null)),
    turn: other(pos.turn),
    castling: pos.castling,
    ep: null,
    halfmove: move.captured || move.promotion || pos.board[idx(parseSq(move.from).file, parseSq(move.from).rank)]?.type === 'p'
      ? 0
      : pos.halfmove + 1,
    fullmove: pos.turn === 'b' ? pos.fullmove + 1 : pos.fullmove,
  };
  const from = parseSq(move.from);
  const to = parseSq(move.to);
  const mover = next.board[idx(from.file, from.rank)];
  if (!mover) throw new Error(`empty ${move.from}`);
  next.board[idx(from.file, from.rank)] = null;
  if (move.enPassant) {
    const capRank = mover.color === 'w' ? to.rank - 1 : to.rank + 1;
    next.board[idx(to.file, capRank)] = null;
  }
  const placedType = move.promotion ?? mover.type;
  next.board[idx(to.file, to.rank)] = { square: move.to, type: placedType, color: mover.color };

  if (move.castle) {
    const home = from.rank;
    if (move.castle === 'k') {
      next.board[idx(7, home)] = null;
      next.board[idx(5, home)] = { square: sq(5, home), type: 'r', color: mover.color };
    } else {
      next.board[idx(0, home)] = null;
      next.board[idx(3, home)] = { square: sq(3, home), type: 'r', color: mover.color };
    }
  }

  if (mover.type === 'k') {
    next.castling = stripCastling(next.castling, mover.color === 'w' ? 'KQ' : 'kq');
  }
  if (mover.type === 'r') {
    if (move.from === 'a1') next.castling = stripCastling(next.castling, 'Q');
    if (move.from === 'h1') next.castling = stripCastling(next.castling, 'K');
    if (move.from === 'a8') next.castling = stripCastling(next.castling, 'q');
    if (move.from === 'h8') next.castling = stripCastling(next.castling, 'k');
  }
  if (move.captured) {
    if (move.to === 'a1') next.castling = stripCastling(next.castling, 'Q');
    if (move.to === 'h1') next.castling = stripCastling(next.castling, 'K');
    if (move.to === 'a8') next.castling = stripCastling(next.castling, 'q');
    if (move.to === 'h8') next.castling = stripCastling(next.castling, 'k');
  }

  if (mover.type === 'p' && Math.abs(to.rank - from.rank) === 2) {
    next.ep = sq(from.file, (from.rank + to.rank) / 2);
  }

  return next;
}

function playState(pos: Position, winner: Color | null = null): PlayState {
  const fen = fenOf(pos);
  if (winner) return { fen, turn: pos.turn, status: 'won', winner };
  if (legalMoves(fen).length === 0) return { fen, turn: pos.turn, status: 'draw', winner: null };
  return { fen, turn: pos.turn, status: 'playing', winner: null };
}

export function snapshotFromFen(fen: string): PlayState {
  return playState(parseFen(fen));
}

export type ApplyMoveResult =
  | { ok: true; state: PlayState; needsPromotion: false; captured: CapturedPiece | null }
  | { ok: true; state: PlayState; needsPromotion: true; from: Square; to: Square }
  | { ok: false };

export function applyMove(
  fen: string,
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
): ApplyMoveResult {
  const pos = parseFen(fen);
  const options = movesFrom(pos, from).filter((m) => m.to === to);
  if (options.length === 0) return { ok: false };
  const needsPromo = options.some((m) => m.promotion);
  if (needsPromo && !promotion) {
    return { ok: true, state: playState(pos), needsPromotion: true, from, to };
  }
  const move = options.find((m) => (m.promotion ? m.promotion === promotion : !needsPromo)) ?? null;
  if (!move) return { ok: false };
  const next = applyOn(pos, move);
  const winner = move.captured === 'k' ? pos.turn : null;
  const captured: CapturedPiece | null = move.captured
    ? { type: move.captured, color: other(pos.turn) }
    : null;
  return { ok: true, state: playState(next, winner), needsPromotion: false, captured };
}

export function piecesFromFen(fen: string): BoardPiece[] {
  return parseFen(fen).board.filter((p): p is BoardPiece => p !== null).map((p) => ({ ...p }));
}

export function pieceAt(fen: string, square: Square): BoardPiece | null {
  const { file, rank } = parseSq(square);
  const piece = at(parseFen(fen), file, rank);
  return piece ? { ...piece } : null;
}

function assertLegal(fen: string, from: Square): Square[] {
  const targets = legalTargets(fen, from);
  if (targets.length === 0) throw new Error(`no legal moves from ${from} in ${fen}`);
  return targets;
}

/** Apply a capture and keep `side` to move so a sequence can continue without an opponent reply. */
export function applyCaptureMove(fen: string, from: Square, to: Square, side: Color): string {
  const result = applyMove(fen, from, to);
  if (!result.ok || result.needsPromotion) throw new Error(`illegal capture ${from}->${to} in ${fen}`);
  if (result.state.status === 'won' || result.state.turn === side) return result.state.fen;
  const pos = parseFen(result.state.fen);
  pos.turn = side;
  return fenOf(pos);
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
  {
    id: 'queen-then-king',
    fen: '4k3/3p4/8/8/8/8/8/3QK3 w - - 0 1',
    side: 'w',
    steps: [
      { from: 'd1', to: 'd7' },
      { from: 'd7', to: 'e8' },
    ],
  },
];

for (const p of CAPTURE_PUZZLES) {
  if (p.steps.length < 2 || p.steps.length > 3) {
    throw new Error(`bad capture puzzle ${p.id}: need 2–3 steps`);
  }
  let fen = p.fen;
  for (const step of p.steps) {
    const move = legalMoves(fen, step.from).find((m) => m.to === step.to && m.captured);
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
  const idxStep = Math.max(0, stepIndex);
  visible.add(puzzle.steps[idxStep].from);
  for (let i = idxStep; i < puzzle.steps.length; i++) visible.add(puzzle.steps[i].to);
  return visible;
}

export function nextCapturePuzzle(prevId: string | null): CapturePuzzle {
  const pool = CAPTURE_PUZZLES.filter((p) => p.id !== prevId);
  return pool[Math.floor(Math.random() * pool.length)] ?? CAPTURE_PUZZLES[0];
}

export function startHotseat(): PlayState {
  return snapshotFromFen(START_FEN);
}

export function hotseatMoves(fen: string, from: Square): ChessMove[] {
  return legalMoves(fen, from);
}

export function tryHotseatMove(
  fen: string,
  from: Square,
  to: Square,
  promotion?: PieceSymbol,
): ApplyMoveResult {
  return applyMove(fen, from, to, promotion);
}

export function modeStars(mode: ChessMode): number {
  return mode === 'moves' ? 2 : mode === 'capture' ? 3 : 4;
}

/** Exported for tests. */
export const _test = { MOVES_POOL, CAPTURE_PUZZLES };
