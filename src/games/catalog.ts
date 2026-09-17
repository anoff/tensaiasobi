import type { ComponentType } from 'react';
import MathGame from './MathGame';
import OddOneOut from './OddOneOut';
import DoodlePad from './DoodlePad';
import MemoryMatch from './MemoryMatch';
import MazeGame from './MazeGame';
import ShapeTrace from './ShapeTrace';
import LetterTrace from './LetterTrace';
import AnlautGame from './AnlautGame';
import EmojiMatch from './EmojiMatch';
import Shiritori from './Shiritori';
import PuzzleGame from './PuzzleGame';
import DispatchGame from './DispatchGame';
import PhysicsPuzzleGame from './PhysicsPuzzleGame';
import TowerSort from './TowerSort';
import FruitMathPop from './FruitMathPop';
import NumberTrain from './NumberTrain';
import ShadowFlashlight from './ShadowFlashlight';
import FairSharePicnic from './FairSharePicnic';
import SnorkelPearlFinder from './SnorkelPearlFinder';

export type GameColor = 'pink' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'red';

export type AgeBand = 'little' | 'big';
export type AgeBandFilter = 'all' | AgeBand;

/** Keys on `t.menu` used as launcher labels (id is not always the label key). */
export type GameLabelKey =
  | 'math'
  | 'odd'
  | 'doodle'
  | 'match'
  | 'maze'
  | 'trace'
  | 'letterTrace'
  | 'anlaut'
  | 'dobble'
  | 'shiritori'
  | 'puzzle'
  | 'dispatch'
  | 'physics'
  | 'towerSort'
  | 'fruitMathPop'
  | 'numberTrain'
  | 'shadowFlashlight'
  | 'fairSharePicnic'
  | 'snorkelPearlFinder';

export interface GameCatalogEntry {
  id: string;
  emoji: string;
  color: GameColor;
  testid: string;
  labelKey: GameLabelKey;
  challengeDefault: boolean;
  ageBands: readonly AgeBand[];
  storageKeys: readonly string[];
  storageKeyPrefixes?: readonly string[];
  Component: ComponentType;
}

export const GAMES = [
  { id: 'math', color: 'blue', testid: 'launch-math', emoji: '🎈', labelKey: 'math', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: ['math_streak', 'math_highscore'], Component: MathGame },
  { id: 'odd', color: 'yellow', testid: 'launch-odd', emoji: '🧐', labelKey: 'odd', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: ['odd_streak', 'odd_highscore'], Component: OddOneOut },
  { id: 'doodle', color: 'pink', testid: 'launch-doodle', emoji: '🎨', labelKey: 'doodle', ageBands: ['little'], challengeDefault: false, storageKeys: [], Component: DoodlePad },
  { id: 'memory', color: 'orange', testid: 'launch-memory', emoji: '🐯', labelKey: 'match', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: [], Component: MemoryMatch },
  { id: 'maze', color: 'green', testid: 'launch-maze', emoji: '🗺️', labelKey: 'maze', ageBands: ['little', 'big'], challengeDefault: false, storageKeys: [], Component: MazeGame },
  { id: 'trace', color: 'purple', testid: 'launch-trace', emoji: '⭐', labelKey: 'trace', ageBands: ['little'], challengeDefault: false, storageKeys: [], Component: ShapeTrace },
  { id: 'letterTrace', color: 'red', testid: 'launch-letterTrace', emoji: '✏️', labelKey: 'letterTrace', ageBands: ['big'], challengeDefault: false, storageKeys: [], Component: LetterTrace },
  { id: 'emojiMatch', color: 'pink', testid: 'launch-emojimatch', emoji: '⚡', labelKey: 'dobble', ageBands: ['little', 'big'], challengeDefault: false, storageKeys: [], storageKeyPrefixes: ['dobble_high_'], Component: EmojiMatch },
  { id: 'anlaut', color: 'red', testid: 'launch-anlaut', emoji: '🔤', labelKey: 'anlaut', ageBands: ['big'], challengeDefault: true, storageKeys: ['anlaut_streak', 'anlaut_highscore'], Component: AnlautGame },
  { id: 'shiritori', color: 'purple', testid: 'launch-shiritori', emoji: '🔗', labelKey: 'shiritori', ageBands: ['big'], challengeDefault: true, storageKeys: ['shiritori_streak', 'shiritori_highscore'], Component: Shiritori },
  { id: 'puzzle', color: 'orange', testid: 'launch-puzzle', emoji: '🧩', labelKey: 'puzzle', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: [], Component: PuzzleGame },
  { id: 'dispatch', color: 'red', testid: 'launch-dispatch', emoji: '🚒', labelKey: 'dispatch', ageBands: ['big'], challengeDefault: true, storageKeys: [], Component: DispatchGame },
  { id: 'physics', color: 'purple', testid: 'launch-physics', emoji: '⚖️', labelKey: 'physics', ageBands: ['big'], challengeDefault: true, storageKeys: [], Component: PhysicsPuzzleGame },
  { id: 'towerSort', color: 'blue', testid: 'launch-tower-sort', emoji: '🗼', labelKey: 'towerSort', ageBands: ['big'], challengeDefault: true, storageKeys: [], storageKeyPrefixes: ['tower_sort_best_moves_'], Component: TowerSort },
  { id: 'fruitMathPop', color: 'orange', testid: 'launch-fruit-math-pop', emoji: '🍎', labelKey: 'fruitMathPop', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: [], Component: FruitMathPop },
  { id: 'numberTrain', color: 'green', testid: 'launch-number-train', emoji: '🚂', labelKey: 'numberTrain', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: [], Component: NumberTrain },
  { id: 'shadowFlashlight', color: 'purple', testid: 'launch-shadow', emoji: '🔦', labelKey: 'shadowFlashlight', ageBands: ['little'], challengeDefault: true, storageKeys: [], Component: ShadowFlashlight },
  { id: 'fairSharePicnic', color: 'green', testid: 'launch-fair-share-picnic', emoji: '🧺', labelKey: 'fairSharePicnic', ageBands: ['little', 'big'], challengeDefault: true, storageKeys: [], Component: FairSharePicnic },
  { id: 'snorkelPearlFinder', color: 'blue', testid: 'launch-snorkel-pearl-finder', emoji: '🤿', labelKey: 'snorkelPearlFinder', ageBands: ['little'], challengeDefault: true, storageKeys: [], Component: SnorkelPearlFinder },
] as const satisfies readonly GameCatalogEntry[];

export type GameId = (typeof GAMES)[number]['id'];

export const GAME_IDS: readonly GameId[] = GAMES.map((game) => game.id);

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value);
}

export function gameVisibleForAge(
  game: { ageBands: readonly AgeBand[] },
  filter: AgeBandFilter,
): boolean {
  if (filter === 'all') return true;
  return game.ageBands.includes(filter);
}

export function defaultChallengeAllowedGames(): Record<GameId, boolean> {
  return Object.fromEntries(GAMES.map((game) => [game.id, game.challengeDefault])) as Record<GameId, boolean>;
}

/** Progress keys owned by stars/coupons/town/challenge — not settings or language. */
export const APP_PROGRESS_KEYS = [
  'gamification_stars',
  'gamification_coupons',
  'gamification_town',
  'challenge_active',
  'challenge_stars_target',
  'challenge_stars_earned',
  'challenge_allowed_games',
  'challenge_coupon_id',
] as const;

export function clearPersistedProgress(): void {
  try {
    const prefixes = GAMES.flatMap((game) =>
      'storageKeyPrefixes' in game ? [...game.storageKeyPrefixes] : [],
    );
    const exact = new Set<string>([
      ...GAMES.flatMap((game) => [...game.storageKeys]),
      ...APP_PROGRESS_KEYS,
    ]);

    for (const key of exact) {
      localStorage.removeItem(key);
    }

    for (const key of Object.keys(localStorage)) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('Error clearing persisted progress', error);
  }
}
