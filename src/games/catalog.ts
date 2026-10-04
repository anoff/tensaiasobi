import type { ComponentType } from 'react';
import type { AgeBand } from '../types/game';
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
import NumberTrain from './NumberTrain';
import ShadowFlashlight from './ShadowFlashlight';
import FairSharePicnic from './FairSharePicnic';
import SnorkelPearlFinder from './SnorkelPearlFinder';
import CrocodileCompare from './CrocodileCompare';
import LetterPairs from './LetterPairs';
import PatternTrain from './PatternTrain';
import SyllableDrum from './SyllableDrum';
import MissingLetter from './MissingLetter';
import AnimalGenie from './AnimalGenie';

export type { AgeBand };
/** Learning games are the challenge focus; play games unlock after the star quota. */
export type GameKind = 'learn' | 'play';

/**
 * Home sections, in display order. Each learning category owns one toy fill
 * (numbers = butter, language = coral, logic = leaf); `play` is the
 * just-for-fun shelf and is the only category whose games are `kind: 'play'`.
 */
export const GAME_CATEGORIES = ['numbers', 'language', 'logic', 'play'] as const;
export type GameCategory = (typeof GAME_CATEGORIES)[number];

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
  | 'numberTrain'
  | 'shadowFlashlight'
  | 'fairSharePicnic'
  | 'snorkelPearlFinder'
  | 'crocodileCompare'
  | 'letterPairs'
  | 'patternTrain'
  | 'syllableDrum'
  | 'missingLetter'
  | 'animalGenie';

export interface GameCatalogEntry {
  id: string;
  emoji: string;
  category: GameCategory;
  testid: string;
  labelKey: GameLabelKey;
  kind: GameKind;
  ageBands: readonly AgeBand[];
  storageKeys: readonly string[];
  storageKeyPrefixes?: readonly string[];
  Component: ComponentType;
}

export const GAMES = [
  // Numbers
  { id: 'math', category: 'numbers', testid: 'launch-math', emoji: '🎈', labelKey: 'math', ageBands: ['little', 'big'], kind: 'learn', storageKeys: ['math_streak', 'math_highscore'], Component: MathGame },
  { id: 'crocodileCompare', category: 'numbers', testid: 'launch-crocodile-compare', emoji: '🐊', labelKey: 'crocodileCompare', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: CrocodileCompare },
  { id: 'numberTrain', category: 'numbers', testid: 'launch-number-train', emoji: '🚂', labelKey: 'numberTrain', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: NumberTrain },
  { id: 'fairSharePicnic', category: 'numbers', testid: 'launch-fair-share-picnic', emoji: '🧺', labelKey: 'fairSharePicnic', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: FairSharePicnic },
  { id: 'physics', category: 'numbers', testid: 'launch-physics', emoji: '⚖️', labelKey: 'physics', ageBands: ['big'], kind: 'learn', storageKeys: [], Component: PhysicsPuzzleGame },
  // Language
  { id: 'letterPairs', category: 'language', testid: 'launch-letter-pairs', emoji: '🔠', labelKey: 'letterPairs', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: LetterPairs },
  { id: 'letterTrace', category: 'language', testid: 'launch-letterTrace', emoji: '✏️', labelKey: 'letterTrace', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: LetterTrace },
  { id: 'syllableDrum', category: 'language', testid: 'launch-syllable-drum', emoji: '🥁', labelKey: 'syllableDrum', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: SyllableDrum },
  { id: 'anlaut', category: 'language', testid: 'launch-anlaut', emoji: '🔤', labelKey: 'anlaut', ageBands: ['big'], kind: 'learn', storageKeys: ['anlaut_streak', 'anlaut_highscore'], Component: AnlautGame },
  { id: 'missingLetter', category: 'language', testid: 'launch-missing-letter', emoji: '✍️', labelKey: 'missingLetter', ageBands: ['big'], kind: 'learn', storageKeys: [], Component: MissingLetter },
  { id: 'shiritori', category: 'language', testid: 'launch-shiritori', emoji: '🔗', labelKey: 'shiritori', ageBands: ['big'], kind: 'learn', storageKeys: ['shiritori_streak', 'shiritori_highscore'], Component: Shiritori },
  // Logic
  { id: 'odd', category: 'logic', testid: 'launch-odd', emoji: '🧐', labelKey: 'odd', ageBands: ['little', 'big'], kind: 'learn', storageKeys: ['odd_streak', 'odd_highscore'], Component: OddOneOut },
  { id: 'patternTrain', category: 'logic', testid: 'launch-pattern-train', emoji: '🚃', labelKey: 'patternTrain', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: PatternTrain },
  { id: 'animalGenie', category: 'logic', testid: 'launch-animal-genie', emoji: '🧞', labelKey: 'animalGenie', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: AnimalGenie },
  { id: 'memory', category: 'logic', testid: 'launch-memory', emoji: '🐯', labelKey: 'match', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: MemoryMatch },
  { id: 'shadowFlashlight', category: 'logic', testid: 'launch-shadow', emoji: '🔦', labelKey: 'shadowFlashlight', ageBands: ['little'], kind: 'learn', storageKeys: [], Component: ShadowFlashlight },
  { id: 'snorkelPearlFinder', category: 'logic', testid: 'launch-snorkel-pearl-finder', emoji: '🤿', labelKey: 'snorkelPearlFinder', ageBands: ['little'], kind: 'learn', storageKeys: [], Component: SnorkelPearlFinder },
  { id: 'puzzle', category: 'logic', testid: 'launch-puzzle', emoji: '🧩', labelKey: 'puzzle', ageBands: ['little', 'big'], kind: 'learn', storageKeys: [], Component: PuzzleGame },
  { id: 'towerSort', category: 'logic', testid: 'launch-tower-sort', emoji: '🗼', labelKey: 'towerSort', ageBands: ['big'], kind: 'learn', storageKeys: [], storageKeyPrefixes: ['tower_sort_best_moves_'], Component: TowerSort },
  // Play (just for fun; unlocks after a learn-first goal)
  { id: 'doodle', category: 'play', testid: 'launch-doodle', emoji: '🎨', labelKey: 'doodle', ageBands: ['little'], kind: 'play', storageKeys: [], Component: DoodlePad },
  { id: 'trace', category: 'play', testid: 'launch-trace', emoji: '⭐', labelKey: 'trace', ageBands: ['little'], kind: 'play', storageKeys: [], Component: ShapeTrace },
  { id: 'maze', category: 'play', testid: 'launch-maze', emoji: '🗺️', labelKey: 'maze', ageBands: ['little', 'big'], kind: 'play', storageKeys: [], Component: MazeGame },
  { id: 'emojiMatch', category: 'play', testid: 'launch-emojimatch', emoji: '⚡', labelKey: 'dobble', ageBands: ['little', 'big'], kind: 'play', storageKeys: [], storageKeyPrefixes: ['dobble_high_'], Component: EmojiMatch },
  { id: 'dispatch', category: 'play', testid: 'launch-dispatch', emoji: '🚒', labelKey: 'dispatch', ageBands: ['little', 'big'], kind: 'play', storageKeys: [], Component: DispatchGame },
] as const satisfies readonly GameCatalogEntry[];

export type GameId = (typeof GAMES)[number]['id'];

export const GAME_IDS: readonly GameId[] = GAMES.map((game) => game.id);

export function isGameId(value: string): value is GameId {
  return (GAME_IDS as readonly string[]).includes(value);
}

export function gameVisibleForAge(
  game: { ageBands: readonly AgeBand[] },
  band: AgeBand,
): boolean {
  return game.ageBands.includes(band);
}

export function gamesInCategory<T extends { category: GameCategory }>(games: readonly T[], category: GameCategory): T[] {
  return games.filter((game) => game.category === category);
}

export function defaultChallengeAllowedGames(): Record<GameId, boolean> {
  return Object.fromEntries(GAMES.map((game) => [game.id, game.kind === 'learn'])) as Record<GameId, boolean>;
}

export function gameVisibleInChallenge(
  game: { id: string; kind: GameKind },
  options: { focusActive: boolean; allowedGames: Record<string, boolean> },
): boolean {
  if (!options.focusActive) return true;
  if (game.kind === 'play') return false;
  return Boolean(options.allowedGames[game.id]);
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
  'challenge_play_unlocked',
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
