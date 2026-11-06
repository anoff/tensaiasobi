import { isGameId, type GameId } from './catalog';

/**
 * Screens with their own link live in the URL hash: `#/<catalog id>` for a game (#75), e.g. `#/maze`,
 * and `#/guide` for the parents' guide. The hash never reaches the server, so the same link works
 * under any base path (GitHub Pages, PR previews, the iOS shell) without touching vite `base`.
 * The slash-less form (`#maze`) is accepted too; anything else is "no route" (the menu).
 */
export type HashRoute = GameId | 'guide';

export function routeFromHash(hash: string): HashRoute | null {
  let slug = hash.replace(/^#\/?/, '');
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  return slug === 'guide' || isGameId(slug) ? slug : null;
}

export function routeHash(route: HashRoute): string {
  return `#/${route}`;
}

/** The public web build. Guide links always point here, also from a PR preview. */
export const PUBLIC_WEB_URL = 'https://asobi.anoff.io/';

/** Shareable link to one game, e.g. `https://asobi.anoff.io/#/maze`. */
export function gameUrl(id: GameId, base: string = PUBLIC_WEB_URL): string {
  return `${base}${routeHash(id)}`;
}
