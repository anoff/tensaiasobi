/**
 * Frozen from the retired per-shelf scene outline pages (PR 99, before the scene themes): where each of the
 * 16 scene pieces sat on its outline, mapped onto a 9:16 My page (x as before, the outline's ground line at
 * 78 % of the page height, size as the nearest page size step). Only used to convert old v2 books, so a
 * piece a kid snapped onto an outline lands on a blank page at the same spot.
 */
import type { SizeStep } from './stickerRules';

export interface LegacyPiece {
  id: string;
  x: number;
  y: number;
  size: SizeStep;
}

/** One entry per old scene set, in shelf order (numbers, language, logic, play). */
export const LEGACY_SCENE_PAGES: readonly (readonly LegacyPiece[])[] = [
  [
    { id: 'scene_numbers_owl_conductor', x: 0.155, y: 0.716, size: 0 },
    { id: 'scene_numbers_engine', x: 0.427, y: 0.704, size: 1 },
    { id: 'scene_numbers_car_balls', x: 0.627, y: 0.726, size: 0 },
    { id: 'scene_numbers_car_shapes', x: 0.839, y: 0.728, size: 0 },
  ],
  [
    { id: 'scene_language_lamp', x: 0.179, y: 0.723, size: 1 },
    { id: 'scene_language_armchair_fox', x: 0.386, y: 0.723, size: 1 },
    { id: 'scene_language_book_stack', x: 0.618, y: 0.737, size: 0 },
    { id: 'scene_language_reading_rug', x: 0.825, y: 0.759, size: 0 },
  ],
  [
    { id: 'scene_logic_circle_tree', x: 0.174, y: 0.725, size: 1 },
    { id: 'scene_logic_tortoise', x: 0.367, y: 0.741, size: 0 },
    { id: 'scene_logic_triangle_tent', x: 0.597, y: 0.721, size: 1 },
    { id: 'scene_logic_block_steps', x: 0.83, y: 0.728, size: 0 },
  ],
  [
    { id: 'scene_fun_slide', x: 0.165, y: 0.735, size: 0 },
    { id: 'scene_fun_panda', x: 0.387, y: 0.732, size: 0 },
    { id: 'scene_fun_sandpit', x: 0.615, y: 0.733, size: 1 },
    { id: 'scene_fun_flowers', x: 0.843, y: 0.735, size: 0 },
  ],
];
