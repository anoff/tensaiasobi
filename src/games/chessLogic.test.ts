import { describe, expect, it } from 'vitest';
import {
  _test,
  START_FEN,
  applyCaptureMove,
  applyMove,
  gradeMovesTap,
  kingsInDanger,
  legalMoves,
  legalTargets,
  modeStars,
  nextCapturePuzzle,
  nextMovesPrompt,
  piecesFromFen,
  snapshotFromFen,
  startHotseat,
  visibleCaptureSquares,
} from './chessLogic';

describe('chessLogic', () => {
  it('builds moves prompts with destinations for every piece type', () => {
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
      for (const [i, step] of puzzle.steps.entries()) {
        const move = legalMoves(fen, step.from).find((m) => m.to === step.to);
        expect(move, `${puzzle.id} ${step.from}${step.to}`).toBeTruthy();
        expect(move!.captured, `${puzzle.id} ${step.from}${step.to}`).toBeTruthy();
        const last = i === puzzle.steps.length - 1;
        if (puzzle.id === 'queen-then-king' && last) expect(move!.captured).toBe('k');
        fen = applyCaptureMove(fen, step.from, step.to, puzzle.side);
      }
    }
    const a = nextCapturePuzzle(null);
    const b = nextCapturePuzzle(a.id);
    expect(b.id).not.toBe(a.id);
  });

  it('hot-seat uses movement rules for castling, en passant and promotion', () => {
    const start = startHotseat();
    expect(start.fen).toBe(START_FEN);
    expect(start.turn).toBe('w');
    expect(start.status).toBe('playing');

    const promoFen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1';
    const needs = applyMove(promoFen, 'e7', 'e8');
    expect(needs.ok && needs.needsPromotion).toBe(true);
    const done = applyMove(promoFen, 'e7', 'e8', 'q');
    expect(done.ok && !done.needsPromotion).toBe(true);
    if (done.ok && !done.needsPromotion) {
      expect(done.state.fen.startsWith('4Q3/')).toBe(true);
    }

    const castleFen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const castleMoves = legalTargets(castleFen, 'e1');
    expect(castleMoves).toContain('g1');
    expect(castleMoves).toContain('c1');
    const castle = applyMove(castleFen, 'e1', 'g1');
    expect(castle.ok && !castle.needsPromotion).toBe(true);
    if (castle.ok && !castle.needsPromotion) {
      expect(piecesFromFen(castle.state.fen).some((p) => p.square === 'g1' && p.type === 'k')).toBe(true);
      expect(piecesFromFen(castle.state.fen).some((p) => p.square === 'f1' && p.type === 'r')).toBe(true);
    }

    let fen = START_FEN;
    for (const [from, to] of [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5']] as const) {
      const result = applyMove(fen, from, to);
      expect(result.ok && !result.needsPromotion).toBe(true);
      if (!result.ok || result.needsPromotion) return;
      fen = result.state.fen;
    }
    const ep = legalMoves(fen, 'e5').filter((m) => m.enPassant);
    expect(ep.length).toBe(1);
    expect(ep[0].to).toBe('d6');

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
    const startFen = START_FEN;
    const first = applyMove(startFen, 'e2', 'e4');
    expect(first.ok && !first.needsPromotion).toBe(true);
    if (!first.ok || first.needsPromotion) return;
    const second = applyMove(first.state.fen, 'd7', 'd5');
    expect(second.ok && !second.needsPromotion).toBe(true);
    if (!second.ok || second.needsPromotion) return;
    const result = applyMove(second.state.fen, 'e4', 'd5');
    expect(result.ok && !result.needsPromotion).toBe(true);
    if (result.ok && !result.needsPromotion) {
      expect(result.captured).toEqual({ type: 'p', color: 'b' });
    }
  });

  describe('movement-only rules', () => {
    const dests = (fen: string, from: 'a1' | string) =>
      legalTargets(fen, from as 'a1').sort();

    it('allows moving into check and staying in check', () => {
      const fen = '4r3/8/8/8/8/8/8/4K2k w - - 0 1';
      expect(dests(fen, 'e1')).toEqual(['d1', 'd2', 'e2', 'f1', 'f2']);
      const stay = applyMove(fen, 'e1', 'e2');
      expect(stay.ok && !stay.needsPromotion).toBe(true);
      if (stay.ok && !stay.needsPromotion) {
        expect(stay.state.status).toBe('playing');
        expect(kingsInDanger(stay.state.fen)).toContain('e2');
      }
    });

    it('lets a pinned piece leave the pin line', () => {
      const fen = 'k3r3/8/8/8/4R3/8/8/4K3 w - - 0 1';
      expect(dests(fen, 'e4')).toContain('d4');
      expect(dests(fen, 'e4')).toContain('h4');
      expect(dests(fen, 'e4')).toContain('e8');
      expect(applyMove(fen, 'e4', 'd4').ok).toBe(true);
      expect(applyMove(fen, 'e4', 'h4').ok).toBe(true);
    });

    it('ends the game when a king is captured, and the capturer wins', () => {
      const fen = '4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1';
      expect(dests(fen, 'e2')).toContain('e8');
      const result = applyMove(fen, 'e2', 'e8');
      expect(result.ok && !result.needsPromotion).toBe(true);
      if (result.ok && !result.needsPromotion) {
        expect(result.captured).toEqual({ type: 'k', color: 'b' });
        expect(result.state.status).toBe('won');
        expect(result.state.winner).toBe('w');
      }
    });

    it('allows castling through, into, and out of check', () => {
      const through = 'r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1';
      expect(dests(through, 'e1')).toContain('g1');
      expect(applyMove(through, 'e1', 'g1').ok).toBe(true);

      const into = 'r3k2r/8/8/8/8/6r1/8/R3K2R w KQkq - 0 1';
      expect(dests(into, 'e1')).toContain('g1');
      expect(applyMove(into, 'e1', 'g1').ok).toBe(true);

      const outOf = 'r3k2r/8/8/8/8/4r3/8/R3K2R w KQkq - 0 1';
      expect(kingsInDanger(outOf)).toContain('e1');
      expect(dests(outOf, 'e1')).toContain('g1');
      expect(dests(outOf, 'e1')).toContain('c1');
      const castle = applyMove(outOf, 'e1', 'g1');
      expect(castle.ok && !castle.needsPromotion).toBe(true);
    });

    it('does not end as a stalemate; a boxed-in side with no king in danger still plays if it has a move', () => {
      // FIDE stalemate (black king a8, white queen b6, white king e1): black can still walk into the queen.
      const fen = 'k7/8/1Q6/8/8/8/8/4K3 b - - 0 1';
      expect(kingsInDanger(fen)).toEqual([]);
      expect(legalMoves(fen).length).toBeGreaterThan(0);
      expect(snapshotFromFen(fen).status).toBe('playing');
      expect(applyMove(fen, 'a8', 'b8').ok).toBe(true);
    });

    it('declares a draw only when the side to move has no movement at all', () => {
      const fen = '7K/8/8/8/8/8/pp6/kp6 b - - 0 1';
      expect(legalMoves(fen)).toEqual([]);
      expect(snapshotFromFen(fen).status).toBe('draw');
      expect(snapshotFromFen(fen).winner).toBe(null);
    });

    it('marks a king that can be captured next move as in danger, without blocking play', () => {
      let fen = START_FEN;
      for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']] as const) {
        const result = applyMove(fen, from, to);
        expect(result.ok && !result.needsPromotion).toBe(true);
        if (!result.ok || result.needsPromotion) return;
        expect(result.state.status).toBe('playing');
        fen = result.state.fen;
      }
      expect(kingsInDanger(fen)).toEqual(['e1']);
      const afterPush = applyMove(fen, 'a2', 'a3');
      expect(afterPush.ok && !afterPush.needsPromotion).toBe(true);
      if (!afterPush.ok || afterPush.needsPromotion) return;
      const mate = applyMove(afterPush.state.fen, 'h4', 'e1');
      expect(mate.ok && !mate.needsPromotion).toBe(true);
      if (mate.ok && !mate.needsPromotion) {
        expect(mate.captured).toEqual({ type: 'k', color: 'w' });
        expect(mate.state.status).toBe('won');
        expect(mate.state.winner).toBe('b');
      }
    });
  });
});
