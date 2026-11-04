import { isGameId, type GameId } from './catalog';

/**
 * Direct game links (#75) live in the URL hash: `#/<catalog id>`, e.g. `#/maze`.
 * The hash never reaches the server, so the same link works under any base path
 * (GitHub Pages, PR previews, the iOS shell) without touching vite `base`.
 * `#<catalog id>` (no slash) is accepted too; anything else is "no game".
 */
export function gameIdFromHash(hash: string): GameId | null {
  let slug = hash.replace(/^#\/?/, '');
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  return isGameId(slug) ? slug : null;
}

export function gameLinkHash(id: GameId): string {
  return `#/${id}`;
}
