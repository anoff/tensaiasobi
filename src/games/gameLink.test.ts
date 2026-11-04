import { describe, expect, it } from 'vitest';
import { GAME_IDS } from './catalog';
import { gameIdFromHash, gameLinkHash } from './gameLink';

describe('game links', () => {
  it('round-trips every catalog id', () => {
    for (const id of GAME_IDS) expect(gameIdFromHash(gameLinkHash(id))).toBe(id);
  });

  it('accepts the slash-less form', () => {
    expect(gameIdFromHash('#maze')).toBe('maze');
  });

  it('treats empty, unknown and malformed hashes as no game', () => {
    for (const hash of ['', '#', '#/', '#/nope', '#/MAZE', '#/maze/extra', '#/%E0%A4%A']) {
      expect(gameIdFromHash(hash)).toBeNull();
    }
  });
});
