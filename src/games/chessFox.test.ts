import { describe, expect, it } from 'vitest';
import { applyMove, hotseatBanner, legalMoves, START_FEN } from './chessLogic';
import {
  THINK_CAP_MS,
  THINK_MAX_MS,
  THINK_MIN_MS,
  castleRookHop,
  chooseFoxMove,
  foxPiecePath,
  foxThinkMs,
  plannedThinkMs,
  type FoxLevel,
} from './chessFox';

function rngFrom(values: number[]): () => number {
  let i = 0;
  return () => {
    const value = values[Math.min(i, values.length - 1)];
    i += 1;
    return value;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function key(from: string, to: string, promotion?: string): string {
  return `${from}${to}${promotion ?? ''}`;
}

function legalKeys(fen: string): Set<string> {
  return new Set(legalMoves(fen).map((move) => key(move.from, move.to, move.promotion)));
}

function kingTakes(fen: string): string[] {
  return legalMoves(fen)
    .filter((move) => move.captured === 'k')
    .map((move) => key(move.from, move.to, move.promotion));
}

function assertLegalChoice(fen: string, level: FoxLevel, rng: () => number) {
  const choice = chooseFoxMove(fen, level, rng);
  expect(legalKeys(fen).has(key(choice.from, choice.to, choice.promotion))).toBe(true);
  const applied = applyMove(fen, choice.from, choice.to, choice.promotion);
  expect(applied.ok).toBe(true);
}

const OPEN_KING = '4k3/8/8/8/8/8/4q3/4K3 b - - 0 1'; // Qe1 takes the king; other queen moves exist
const TWO_KING_TAKES = '4k3/8/8/8/8/8/3rq3/4K3 b - - 0 1'; // Qe1 or Rd1
const BLOCKED_FILE = '4k3/4b3/8/8/8/8/8/4R1K1 b - - 0 1'; // moving the bishop off the e-file leaves the king open
const MIDGAME = 'r1bq1rk1/pp2nppp/2n1p3/3pP3/3P4/2PB1N2/P4PPP/RNBQK2R w KQ - 3 9';
const PROMO = '7k/P7/8/8/8/8/8/4K3 w - - 0 1';
const EN_PASSANT = '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1';

describe('chessFox delay', () => {
  it('plans a think between 1s and 3s for any rng in [0, 1)', () => {
    for (const u of [0, 0.0001, 0.25, 0.5, 0.75, 0.9999]) {
      const planned = plannedThinkMs(rngFrom([u]));
      expect(planned).toBeGreaterThanOrEqual(THINK_MIN_MS);
      expect(planned).toBeLessThanOrEqual(THINK_MAX_MS);
    }
    expect(plannedThinkMs(rngFrom([0]))).toBe(THINK_MIN_MS);
    expect(plannedThinkMs(rngFrom([1]))).toBeLessThanOrEqual(THINK_MAX_MS);
    expect(THINK_MIN_MS).toBe(1000);
    expect(THINK_MAX_MS).toBe(3000);
  });

  it('uses the injected rng, so the wait is deterministic', () => {
    expect(plannedThinkMs(rngFrom([0]))).toBe(1000);
    expect(plannedThinkMs(rngFrom([0.5]))).toBe(2000);
    expect(plannedThinkMs(rngFrom([0.999999]))).toBeGreaterThan(2999);
    expect(plannedThinkMs(rngFrom([0.999999]))).toBeLessThanOrEqual(3000);
  });

  it('waits for the planned pause when the search is instant or short', () => {
    expect(foxThinkMs({ plannedMs: 2000, searchMs: 0 })).toBe(2000);
    expect(foxThinkMs({ plannedMs: 2000, searchMs: 300 })).toBe(2000);
  });

  it('never waits less than 1s or more than 3s', () => {
    expect(foxThinkMs({ plannedMs: 0, searchMs: 0 })).toBe(THINK_MIN_MS);
    expect(foxThinkMs({ plannedMs: 1400, searchMs: 5000 })).toBe(THINK_CAP_MS);
    expect(foxThinkMs({ plannedMs: 700, searchMs: 5000 })).toBe(THINK_CAP_MS);
    for (const plannedMs of [0, 700, 1000, 2000, 3000, 8000]) {
      for (const searchMs of [0, 10, 800, 1400, 1999, 2000, 8000]) {
        const wait = foxThinkMs({ plannedMs, searchMs });
        expect(wait).toBeGreaterThanOrEqual(THINK_MIN_MS);
        expect(wait).toBeLessThanOrEqual(THINK_CAP_MS);
      }
    }
  });
});

describe('fox move path', () => {
  it('steps a sliding piece one square at a time, including the destination', () => {
    expect(foxPiecePath('a8', 'a5', 'r')).toEqual(['a7', 'a6', 'a5']);
    expect(foxPiecePath('a1', 'd4', 'b')).toEqual(['b2', 'c3', 'd4']);
    expect(foxPiecePath('d8', 'h4', 'q')).toEqual(['e7', 'f6', 'g5', 'h4']);
    expect(foxPiecePath('h1', 'h2', 'r')).toEqual(['h2']);
  });

  it('treats a knight jump, a king step and a pawn move as one hop', () => {
    expect(foxPiecePath('b8', 'c6', 'n')).toEqual(['c6']);
    expect(foxPiecePath('g8', 'f6', 'n')).toEqual(['f6']);
    expect(foxPiecePath('e8', 'e7', 'k')).toEqual(['e7']);
    expect(foxPiecePath('e7', 'e5', 'p')).toEqual(['e5']);
    expect(foxPiecePath('d7', 'd5', 'p')).toEqual(['d5']);
  });

  it('walks a castling king two squares, then names the rook hop', () => {
    expect(foxPiecePath('e8', 'g8', 'k', 'k')).toEqual(['f8', 'g8']);
    expect(foxPiecePath('e8', 'c8', 'k', 'q')).toEqual(['d8', 'c8']);
    expect(castleRookHop('b', 'k')).toEqual({ from: 'h8', to: 'f8' });
    expect(castleRookHop('b', 'q')).toEqual({ from: 'a8', to: 'd8' });
    expect(foxPiecePath('e1', 'g1', 'k', 'k')).toEqual(['f1', 'g1']);
    expect(castleRookHop('w', 'k')).toEqual({ from: 'h1', to: 'f1' });
  });
});

describe('Clever always takes an available king', () => {
  const cases = [
    { name: 'queen takes the open king', fen: OPEN_KING },
    { name: 'more than one king capture', fen: TWO_KING_TAKES },
  ];

  it.each(cases)('$name', ({ fen }) => {
    const takes = kingTakes(fen);
    expect(takes.length).toBeGreaterThan(0);
    for (const seed of [1, 2, 3, 7, 13, 99, 12345]) {
      const choice = chooseFoxMove(fen, 'clever', mulberry32(seed));
      expect(takes).toContain(key(choice.from, choice.to, choice.promotion));
    }
  });

  it('never plays a non-king-capture when the king is open', () => {
    const takes = new Set(kingTakes(TWO_KING_TAKES));
    const seen = new Set<string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const choice = chooseFoxMove(TWO_KING_TAKES, 'clever', mulberry32(seed));
      seen.add(key(choice.from, choice.to, choice.promotion));
    }
    expect([...seen].every((move) => takes.has(move))).toBe(true);
  });
});

describe('Clever protects its own king when it can', () => {
  it('does not move a blocker off the file if that leaves its king capturable', () => {
    const fen = BLOCKED_FILE;
    expect(kingTakes(fen)).toHaveLength(0);
    const exposing = legalMoves(fen)
      .filter((move) => {
        const after = applyMove(fen, move.from, move.to, move.promotion);
        if (!after.ok || after.needsPromotion) return false;
        return kingTakes(after.state.fen).length > 0;
      })
      .map((move) => key(move.from, move.to, move.promotion));
    expect(exposing.length).toBeGreaterThan(0);
    for (const seed of [1, 2, 3, 5, 8, 21, 44]) {
      const choice = chooseFoxMove(fen, 'clever', mulberry32(seed));
      expect(exposing).not.toContain(key(choice.from, choice.to, choice.promotion));
      expect(legalKeys(fen).has(key(choice.from, choice.to, choice.promotion))).toBe(true);
    }
  });
});

describe('Gentle takes an open king about 1 time in 4', () => {
  it('takes the king when the injected rng is below 0.25', () => {
    const takes = kingTakes(OPEN_KING);
    expect(takes.length).toBeGreaterThan(0);
    for (const u of [0, 0.1, 0.2499]) {
      const choice = chooseFoxMove(OPEN_KING, 'gentle', rngFrom([u, 0]));
      expect(takes).toContain(key(choice.from, choice.to, choice.promotion));
    }
  });

  it('does not hunt the king when the injected rng is 0.25 or above', () => {
    const takes = new Set(kingTakes(OPEN_KING));
    expect(takes.size).toBeGreaterThan(0);
    for (const u of [0.25, 0.5, 0.9]) {
      const choice = chooseFoxMove(OPEN_KING, 'gentle', rngFrom([u, 0, 0]));
      expect(takes.has(key(choice.from, choice.to, choice.promotion))).toBe(false);
    }
  });
});

describe('fox only returns moves from the shared generator', () => {
  function walk(seed: number, plies: number): string {
    const rng = mulberry32(seed);
    let fen = START_FEN;
    for (let i = 0; i < plies; i += 1) {
      const moves = legalMoves(fen);
      if (moves.length === 0) break;
      const move = moves[Math.floor(rng() * moves.length)];
      const applied = applyMove(fen, move.from, move.to, move.promotion);
      if (!applied.ok || applied.needsPromotion) break;
      if (applied.state.status !== 'playing') break;
      fen = applied.state.fen;
    }
    return fen;
  }

  function loadable(fen: string): boolean {
    try {
      return legalMoves(fen).length > 0;
    } catch {
      return false;
    }
  }

  it('Gentle and Clever stay inside legalMoves', () => {
    const compact = [START_FEN, PROMO, EN_PASSANT, OPEN_KING, TWO_KING_TAKES, BLOCKED_FILE, '8/4k3/8/8/8/8/4K3/8 w - - 0 1'].filter(loadable);
    const wider = [MIDGAME, 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq - 0 1', walk(1, 6), walk(2, 8)].filter(loadable);
    expect(compact.length + wider.length).toBeGreaterThan(3);
    for (const fen of compact) {
      assertLegalChoice(fen, 'gentle', mulberry32(fen.length));
      assertLegalChoice(fen, 'clever', mulberry32(fen.length + 1));
    }
    for (const fen of wider) {
      assertLegalChoice(fen, 'gentle', mulberry32(fen.length));
    }
  });

  it('holds the mover on the banner during the tip-over, then the fox wins', () => {
    const result = applyMove(OPEN_KING, 'e2', 'e1');
    expect(result.ok && !result.needsPromotion).toBe(true);
    if (!result.ok || result.needsPromotion) return;
    expect(result.state.winner).toBe('b');
    const duringTip = hotseatBanner(
      { ...result.state, status: 'playing', winner: null },
      result.state.winner,
      false,
    );
    expect(duringTip).toEqual({ kind: 'toMove', side: 'b' });
    const afterTip = hotseatBanner(result.state, null, false);
    expect(afterTip).toEqual({ kind: 'won', side: 'b' });
  });
});
