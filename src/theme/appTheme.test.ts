import { describe, expect, it } from 'vitest';
import { APP_THEMES, THEME_EMOJI, nextTheme, toAppTheme } from './appTheme';

describe('app theme', () => {
  it('has three themes, each with an emoji', () => {
    expect(APP_THEMES).toEqual(['animals', 'space', 'ocean']);
    for (const id of APP_THEMES) expect(THEME_EMOJI[id]).toBeTruthy();
  });

  it('cycles animals → space → ocean → animals', () => {
    expect(nextTheme('animals')).toBe('space');
    expect(nextTheme('space')).toBe('ocean');
    expect(nextTheme('ocean')).toBe('animals');
  });

  it('falls back to animals for unknown stored values', () => {
    for (const id of APP_THEMES) expect(toAppTheme(id)).toBe(id);
    for (const bad of ['fruits', 'puppy', 'monkey', '', null, undefined, 3, {}]) expect(toAppTheme(bad)).toBe('animals');
  });
});
