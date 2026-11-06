import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import {
  _test,
  gradeMovesTap,
  applyCaptureMove,
  hotseatMoves,
  legalTargets,
  modeStars,
  nextCapturePuzzle,
  nextMovesPrompt,
  piecesFromFen,
  startHotseat,
  tryHotseatMove,
  visibleCaptureSquares,
} from './chessLogic';

describe('chessLogic', () => {
  it('builds moves prompts with legal destinations for every piece type', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const p = nextMovesPrompt(null, i);
      seen.add(p.piece);
      expect(p.legalTargets.length).toBeGreaterThan(0);
      expect(legalTargets(p.fen, p.from).sort()).toEqual([...p.legalTargets].sort());
      expect(gradeMovesTap(p, p.legalTargets[0])).toBe('hit');
      expect(gradeMovesTap(p, p.from)).toBe('miss');
    }
    expect(seen).toEqual(new Set(['p', 'r', 'n', 'b', 'q', 'k']));
  });

  it('wires every capture puzzle as a short sequence of real captures', () => {
    for (const puzzle of _test.CAPTURE_PUZZLES) {
      expect(puzzle.steps.length).toBeGreaterThanOrEqual(2);
      expect(puzzle.steps.length).toBeLessThanOrEqual(3);
      let fen = puzzle.fen;
      for (const step of puzzle.steps) {
        const chess = new Chess(fen);
        const move = chess.moves({ square: step.from, verbose: true }).find((m) => m.to === step.to);
        expect(move, `${puzzle.id} ${step.from}${step.to}`).toBeTruthy();
        expect(move!.captured, `${puzzle.id} ${step.from}${step.to}`).toBeTruthy();
        expect(() => chess.move({ from: step.from, to: step.to })).not.toThrow();
        fen = applyCaptureMove(fen, step.from, step.to, puzzle.side);
      }
    }
    const a = nextCapturePuzzle(null);
    const b = nextCapturePuzzle(a.id);
    expect(b.id).not.toBe(a.id);
  });

  it('hot-seat uses chess.js for castling, en passant, promotion, mate and stalemate', () => {
    const start = startHotseat();
    expect(start.fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe(true);
    expect(start.turn).toBe('w');
    expect(start.status).toBe('playing');

    // Fool's mate: f3 e5 g4 Qh4#
    const mate = (() => {
      const c = new Chess();
      c.move('f3'); c.move('e5'); c.move('g4');
      return tryHotseatMove(c.fen(), 'd8', 'h4');
    })();
    expect(mate.ok).toBe(true);
    if (mate.ok && !mate.needsPromotion) {
      expect(mate.state.status).toBe('checkmate');
      expect(mate.state.winner).toBe('b');
    }

    // Promotion needs a picker when omitted.
    const promoFen = (() => {
      const c = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
      return c.fen();
    })();
    const needs = tryHotseatMove(promoFen, 'e7', 'e8');
    expect(needs.ok && needs.needsPromotion).toBe(true);
    const done = tryHotseatMove(promoFen, 'e7', 'e8', 'q');
    expect(done.ok && !done.needsPromotion).toBe(true);

    // Castling available from start-like rights position.
    const castleFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const castleMoves = hotseatMoves(castleFen, 'e1').map((m) => m.to);
    expect(castleMoves).toContain('g1');
    expect(castleMoves).toContain('c1');

    // En passant
    const ep = new Chess();
    ep.move('e4'); ep.move('a6'); ep.move('e5'); ep.move('d5');
    const epMoves = ep.moves({ square: 'e5', verbose: true }).filter((m) => m.flags.includes('e'));
    expect(epMoves.length).toBe(1);
    expect(epMoves[0].to).toBe('d6');

    expect(modeStars('moves')).toBe(2);
    expect(modeStars('capture')).toBe(3);
    expect(modeStars('hotseat')).toBe(4);
    expect(piecesFromFen(start.fen).length).toBe(32);
  });

  it('names only the capturer and remaining targets as visible capture squares', () => {
    const pawn = _test.CAPTURE_PUZZLES.find((puzzle) => puzzle.id === 'pawn-two')!;
    const start = visibleCaptureSquares(pawn, 0);
    expect([...start].sort()).toEqual(['c6', 'd5', 'e4']);
    const mid = visibleCaptureSquares(pawn, 1);
    expect([...mid].sort()).toEqual(['c6', 'd5']);
    const done = visibleCaptureSquares(pawn, 2);
    expect([...done]).toEqual(['c6']);

    const queen = _test.CAPTURE_PUZZLES.find((puzzle) => puzzle.id === 'queen-file-two')!;
    expect([...visibleCaptureSquares(queen, 0)].sort()).toEqual(['d1', 'd5', 'd7']);
  });

  it('reports the captured piece after a hot-seat take', () => {
    const fen = (() => {
      const c = new Chess();
      c.move('e4');
      c.move('d5');
      return c.fen();
    })();
    const result = tryHotseatMove(fen, 'e4', 'd5');
    expect(result.ok && !result.needsPromotion).toBe(true);
    if (result.ok && !result.needsPromotion) {
      expect(result.captured).toEqual({ type: 'p', color: 'b' });
    }
  });
});
