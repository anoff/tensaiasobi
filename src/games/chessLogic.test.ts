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

  describe('hotseat allows every legal move and blocks only self-check', () => {
    const dests = (fen: string, from: Parameters<typeof tryHotseatMove>[1]) =>
      hotseatMoves(fen, from).map((m) => m.to).sort();

    it('allows a move that gives checkmate and records it as a win', () => {
      // Back-rank mate: Qd8#.
      const fen = '6k1/5ppp/8/8/8/8/8/3QK3 w - - 0 1';
      expect(dests(fen, 'd1')).toContain('d8');
      const result = tryHotseatMove(fen, 'd1', 'd8');
      expect(result.ok && !result.needsPromotion).toBe(true);
      if (result.ok && !result.needsPromotion) {
        expect(result.state.status).toBe('checkmate');
        expect(result.state.winner).toBe('w');
      }
    });

    it('when in check, allows every escape (king move, block, capture) and nothing else', () => {
      // Black rook on e8 checks the white king. Queen can capture or block; rook can block; king can flee.
      const fen = '1k2r3/8/8/7Q/8/8/R7/4K3 w - - 0 1';
      expect(dests(fen, 'e1').sort()).toEqual(['d1', 'd2', 'f1', 'f2']);
      expect(dests(fen, 'h5').sort()).toEqual(['e2', 'e5', 'e8']);
      expect(dests(fen, 'a2')).toEqual(['e2']);

      for (const [from, to] of [
        ['e1', 'd1'],
        ['e1', 'd2'],
        ['e1', 'f1'],
        ['e1', 'f2'],
        ['h5', 'e2'],
        ['h5', 'e5'],
        ['h5', 'e8'],
        ['a2', 'e2'],
      ] as const) {
        const result = tryHotseatMove(fen, from, to);
        expect(result.ok && !result.needsPromotion, `${from}->${to}`).toBe(true);
        if (result.ok && !result.needsPromotion) {
          expect(result.state.turn).toBe('b');
          expect(result.state.fen).not.toBe(fen);
        }
      }

      // Staying in check, or moving a piece that does not resolve it, is rejected.
      expect(tryHotseatMove(fen, 'e1', 'e2').ok).toBe(false);
      expect(tryHotseatMove(fen, 'a2', 'a8').ok).toBe(false);
      expect(tryHotseatMove(fen, 'a2', 'a1').ok).toBe(false);
      expect(tryHotseatMove(fen, 'h5', 'h6').ok).toBe(false);
      expect(tryHotseatMove(fen, 'h5', 'a5').ok).toBe(false);

      // Querying legal moves does not apply one; every escape is still available.
      expect(dests(fen, 'e1').length + dests(fen, 'h5').length + dests(fen, 'a2').length).toBe(8);
    });

    it('keeps a pinned piece on the pin line and allows capturing the pinner', () => {
      const fen = 'k3r3/8/8/8/4R3/8/8/4K3 w - - 0 1';
      expect(dests(fen, 'e4')).toEqual(['e2', 'e3', 'e5', 'e6', 'e7', 'e8'].sort());

      expect(tryHotseatMove(fen, 'e4', 'e8').ok).toBe(true);
      expect(tryHotseatMove(fen, 'e4', 'e2').ok).toBe(true);
      expect(tryHotseatMove(fen, 'e4', 'e7').ok).toBe(true);

      expect(tryHotseatMove(fen, 'e4', 'd4').ok).toBe(false);
      expect(tryHotseatMove(fen, 'e4', 'f4').ok).toBe(false);
      expect(tryHotseatMove(fen, 'e4', 'a4').ok).toBe(false);
      expect(tryHotseatMove(fen, 'e4', 'h4').ok).toBe(false);
    });

    it('allows a move that lets the opponent mate on the next turn', () => {
      const start = startHotseat();
      const f3 = tryHotseatMove(start.fen, 'f2', 'f3');
      expect(f3.ok && !f3.needsPromotion).toBe(true);
      if (!f3.ok || f3.needsPromotion) return;
      expect(f3.state.status).toBe('playing');

      const e5 = tryHotseatMove(f3.state.fen, 'e7', 'e5');
      expect(e5.ok && !e5.needsPromotion).toBe(true);
      if (!e5.ok || e5.needsPromotion) return;

      const g4 = tryHotseatMove(e5.state.fen, 'g2', 'g4');
      expect(g4.ok && !g4.needsPromotion).toBe(true);
      if (!g4.ok || g4.needsPromotion) return;
      expect(g4.state.status).toBe('playing');
      expect(dests(g4.state.fen, 'd8')).toContain('h4');

      const mate = tryHotseatMove(g4.state.fen, 'd8', 'h4');
      expect(mate.ok && !mate.needsPromotion).toBe(true);
      if (mate.ok && !mate.needsPromotion) {
        expect(mate.state.status).toBe('checkmate');
        expect(mate.state.winner).toBe('b');
      }
    });
  });
});
