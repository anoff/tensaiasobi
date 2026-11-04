import { describe, expect, it } from 'vitest';
import { GAME_IDS } from './catalog';
import { gameUrl, routeFromHash, routeHash } from './gameLink';

describe('hash routes', () => {
  it('round-trips every catalog id and the guide', () => {
    for (const id of GAME_IDS) expect(routeFromHash(routeHash(id))).toBe(id);
    expect(routeFromHash(routeHash('guide'))).toBe('guide');
  });

  it('accepts the slash-less form', () => {
    expect(routeFromHash('#maze')).toBe('maze');
    expect(routeFromHash('#guide')).toBe('guide');
  });

  it('treats empty, unknown and malformed hashes as no route', () => {
    for (const hash of ['', '#', '#/', '#/nope', '#/MAZE', '#/maze/extra', '#/GUIDE', '#/guide/x', '#/%E0%A4%A']) {
      expect(routeFromHash(hash)).toBeNull();
    }
  });
});

describe('gameUrl', () => {
  it('points at the public web build', () => {
    expect(gameUrl('maze')).toBe('https://asobi.anoff.io/#/maze');
    expect(routeFromHash(new URL(gameUrl('towerSort')).hash)).toBe('towerSort');
  });
});
