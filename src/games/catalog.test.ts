import { afterEach, describe, expect, it } from 'vitest';
import { APP_PROGRESS_KEYS, GAMES, clearPersistedProgress, defaultChallengeAllowedGames, gameVisibleForAge, gameVisibleInChallenge, isGameId } from './catalog';

describe('game catalog', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('has unique ids and testids', () => {
    const ids = GAMES.map((game) => game.id);
    const testids = GAMES.map((game) => game.testid);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(testids).size).toBe(testids.length);
  });

  it('assigns every game at least one age band', () => {
    for (const game of GAMES) {
      expect(game.ageBands.length).toBeGreaterThan(0);
    }
    expect(gameVisibleForAge(GAMES.find((g) => g.id === 'doodle')!, 'little')).toBe(true);
    expect(gameVisibleForAge(GAMES.find((g) => g.id === 'doodle')!, 'big')).toBe(false);
    expect(gameVisibleForAge(GAMES.find((g) => g.id === 'shiritori')!, 'little')).toBe(false);
    expect(gameVisibleForAge(GAMES.find((g) => g.id === 'math')!, 'all')).toBe(true);
  });

  it('covers every GameId in challenge defaults', () => {
    const defaults = defaultChallengeAllowedGames();
    for (const game of GAMES) {
      expect(defaults[game.id]).toBe(game.kind === 'learn');
      expect(isGameId(game.id)).toBe(true);
    }
    expect(isGameId('town')).toBe(false);
    expect(GAMES.find((g) => g.id === 'doodle')?.kind).toBe('play');
    expect(GAMES.find((g) => g.id === 'math')?.kind).toBe('learn');
  });

  it('hides play games while a challenge is in the focus phase', () => {
    const doodle = GAMES.find((g) => g.id === 'doodle')!;
    const math = GAMES.find((g) => g.id === 'math')!;
    const allowed = defaultChallengeAllowedGames();
    expect(gameVisibleInChallenge(doodle, { focusActive: true, allowedGames: allowed })).toBe(false);
    expect(gameVisibleInChallenge(math, { focusActive: true, allowedGames: allowed })).toBe(true);
    expect(gameVisibleInChallenge(doodle, { focusActive: false, allowedGames: allowed })).toBe(true);
  });

  it('clearPersistedProgress removes exact keys, prefixes, and app progress', () => {
    localStorage.setItem('math_streak', '4');
    localStorage.setItem('shiritori_streak', '2');
    localStorage.setItem('dobble_high_solo_zen_easy', '9');
    localStorage.setItem('tower_sort_best_moves_easy_fruit', '12');
    localStorage.setItem('gamification_stars', '80');
    localStorage.setItem('challenge_active', 'true');
    localStorage.setItem('settings_sound_enabled', 'false');
    localStorage.setItem('app_language', 'ja');

    clearPersistedProgress();

    expect(localStorage.getItem('math_streak')).toBeNull();
    expect(localStorage.getItem('shiritori_streak')).toBeNull();
    expect(localStorage.getItem('dobble_high_solo_zen_easy')).toBeNull();
    expect(localStorage.getItem('tower_sort_best_moves_easy_fruit')).toBeNull();
    expect(localStorage.getItem('gamification_stars')).toBeNull();
    expect(localStorage.getItem('challenge_active')).toBeNull();
    expect(localStorage.getItem('settings_sound_enabled')).toBe('false');
    expect(localStorage.getItem('app_language')).toBe('ja');

    for (const key of APP_PROGRESS_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }
  });
});
