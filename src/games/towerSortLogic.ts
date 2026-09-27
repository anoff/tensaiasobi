import type { GameDifficulty } from '../types/game';
import type { TowerSortTheme } from './towerSortThemes';

export interface TowerSortConfig {
  types: number;
  towers: number;
  /** Pieces per type — also the capacity of every tube. Capped at 4. */
  height: number;
  scrambleSteps: number;
  starsAward: number;
}

/**
 * Difficulty adds pieces and scramble depth, never extra columns: four
 * tubes keep every tube ≥ 72px wide on a phone.
 */
export const TOWER_SORT_CONFIG: Record<GameDifficulty, TowerSortConfig> = {
  easy: { types: 2, towers: 4, height: 3, scrambleSteps: 12, starsAward: 5 },
  medium: { types: 3, towers: 4, height: 3, scrambleSteps: 24, starsAward: 10 },
  hard: { types: 3, towers: 4, height: 4, scrambleSteps: 40, starsAward: 18 },
};

export function canDrop(towers: string[][], to: number, capacity: number): boolean {
  return towers[to].length < capacity;
}

export function isSolved(towers: string[][]): boolean {
  const seenTypes = new Set<string>();
  for (const tower of towers) {
    if (tower.length === 0) continue;
    const first = tower[0];
    if (seenTypes.has(first)) return false;
    seenTypes.add(first);
    if (!tower.every((emoji) => emoji === first)) return false;
  }
  return true;
}

/**
 * Starts from the solved board and applies random legal moves. Every move is
 * reversible under the capacity rule, so the result is always solvable.
 */
export function generateTowers(difficulty: GameDifficulty, theme: TowerSortTheme): string[][] {
  const { types, towers: towerCount, height, scrambleSteps } = TOWER_SORT_CONFIG[difficulty];
  const towers: string[][] = Array.from({ length: towerCount }, (_, i) =>
    i < types ? Array(height).fill(theme.emojis[i]) : [],
  );

  let lastMove: [number, number] | null = null;
  for (let step = 0; step < scrambleSteps || isSolved(towers); step++) {
    const moves: [number, number][] = [];
    for (let from = 0; from < towerCount; from++) {
      if (towers[from].length === 0) continue;
      for (let to = 0; to < towerCount; to++) {
        if (to === from || !canDrop(towers, to, height)) continue;
        // Don't immediately undo the previous move.
        if (lastMove && lastMove[0] === to && lastMove[1] === from) continue;
        moves.push([from, to]);
      }
    }
    if (moves.length === 0) {
      lastMove = null;
      continue;
    }
    const [from, to] = moves[Math.floor(Math.random() * moves.length)];
    towers[to].push(towers[from].pop()!);
    lastMove = [from, to];
  }
  return towers;
}
